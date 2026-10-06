// Background removal worker: runs inside an Inngest job (server-side), never
// in the request or UI path. Original stays live until the transparent copy
// is verified — failures keep the original + notify, never a broken image.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getDb } from "./store";

export interface BgJobRow { id: number; assetId: number; productId: number; status: string; note: string }

export function bgTables(): void {
  getDb().exec(`CREATE TABLE IF NOT EXISTS BgJob (
    id INTEGER PRIMARY KEY AUTOINCREMENT, assetId INTEGER NOT NULL, productId INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'queued', note TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
}

export function enqueueBgRemove(assetId: number, productId: number): number {
  bgTables();
  return Number(getDb().prepare("INSERT INTO BgJob (assetId, productId) VALUES (?,?)").run(assetId, productId).lastInsertRowid);
}

export function bgJob(id: number): BgJobRow | null {
  bgTables();
  return (getDb().prepare("SELECT * FROM BgJob WHERE id=?").get(id) as BgJobRow | undefined) ?? null;
}

// Storage layout: products/{productId}/{slug}-{ts}.ext — same tree locally
// and on R2, so either side can find the other's files.
export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "item";
}

export function productFile(productId: number, name: string, ext: string, suffix = ""): string {
  const stamp = Date.now().toString(36);
  return `products/${productId}/${slugify(name)}${suffix}-${stamp}.${ext}`;
}

// First-writer-wins transparent swap shared by the client worker endpoint
// and the Inngest job: whoever arrives first flips queued→done; the loser
// no-ops instead of double-writing.
export async function swapTransparent(jobId: number, png: Buffer, mote = ""): Promise<{ swapped: boolean; url?: string }> {
  bgTables();
  const db = getDb();
  const job = bgJob(jobId);
  if (!job || (job.status !== "queued" && job.status !== "working")) return { swapped: false };
  const asset = db.prepare("SELECT filename FROM MediaAsset WHERE id=?").get(job.assetId) as
    { filename: string } | undefined;
  if (!asset) {
    db.prepare("UPDATE BgJob SET status='failed', note='asset gone' WHERE id=?").run(jobId);
    return { swapped: false };
  }
  const claimed = db.prepare("UPDATE BgJob SET status='working', note=? WHERE id=? AND status IN ('queued','working')").run(mote || "swapping", jobId);
  if (claimed.changes === 0) return { swapped: false };
  const remote = /^https?:\/\//.test(asset.filename);
  const prod = job.productId ? (db.prepare("SELECT name FROM Product WHERE id=?").get(job.productId) as { name: string } | undefined) : null;
  const rel = productFile(job.productId || 0, prod?.name ?? "item", "png", "-nobg");
  let url: string;
  if (remote) {
    const { getProvider } = await import("./providers");
    if (!getProvider("media").R2_ACCOUNT_ID) throw new Error("R2 gone");
    const { r2Put } = await import("./r2");
    url = (await r2Put(png, rel, "image/png")).url;
    db.prepare("UPDATE MediaAsset SET filename=? WHERE id=?").run(url, job.assetId);
  } else {
    const { writeFile, mkdir } = await import("node:fs/promises");
    const { join, dirname } = await import("node:path");
    await mkdir(join(process.cwd(), "public", "uploads", dirname(rel)), { recursive: true });
    await writeFile(join(process.cwd(), "public", "uploads", rel), png);
    url = `/uploads/${rel}`;
    db.prepare("UPDATE MediaAsset SET filename=? WHERE id=?").run(rel, job.assetId);
  }
  if (job.productId) {
    const pr = db.prepare("SELECT images FROM Product WHERE id=?").get(job.productId) as { images: string } | undefined;
    if (pr) {
      const imgs = JSON.parse(pr.images || "[]") as string[];
      const old = remote ? asset.filename : `/uploads/${asset.filename}`;
      const next = imgs.map((u) => (u === old ? url : u));
      if (next.join() !== imgs.join()) {
        db.prepare("UPDATE Product SET images=? WHERE id=?").run(JSON.stringify(next).slice(0, 4000), job.productId);
      }
    }
  }
  db.prepare("UPDATE BgJob SET status='done', note=? WHERE id=?").run(url.slice(0, 300), jobId);
  db.prepare("INSERT INTO Notification (title, body, audience, kind, target) VALUES (?,?,?,?,?)")
    .run("Background removed", `Transparent image live${job.productId ? ` on product #${job.productId}` : ""}.`, "team", "info", "team");
  return { swapped: true, url };
}

function setJob(id: number, status: string, note: string): void {
  getDb().prepare("UPDATE BgJob SET status=?, note=? WHERE id=?").run(status, note.slice(0, 300), id);
}

async function loadBytes(asset: { filename: string }): Promise<Buffer> {
  // R2-hosted assets live as full URLs in filename; local ones are bare names.
  if (/^https?:\/\//.test(asset.filename)) {
    const res = await fetch(asset.filename, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`fetch source (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  return readFile(join(process.cwd(), "public", "uploads", asset.filename));
}

export async function runBgRemove(jobId: number): Promise<{ ok: boolean; url?: string }> {
  bgTables();
  const job = bgJob(jobId);
  if (!job || job.status !== "queued") return { ok: false };
  setJob(jobId, "working", "engine starting");
  try {
    const db = getDb();
    const asset = db.prepare("SELECT filename, mime FROM MediaAsset WHERE id=?").get(job.assetId) as
      { filename: string; mime: string } | undefined;
    if (!asset) throw new Error("asset gone");
    const bytes = await loadBytes(asset);
    // Engine order: hosted API when keyed (works everywhere) → local WASM
    // (Linux/prod Node; this Android Node cannot run onnxruntime-web).
    let outBytes: Buffer;
    const { getProvider } = await import("./providers");
    const clipKey = getProvider("media").CLIPDROP_API_KEY || "";
    if (clipKey) {
      const form = new FormData();
      form.append("image_file", new Blob([new Uint8Array(bytes)], { type: asset.mime || "image/png" }), "src.png");
      const res = await fetch("https://clipdrop-api.co/remove-background/v1", {
        method: "POST", headers: { "x-api-key": clipKey }, body: form,
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) throw new Error(`provider http ${res.status}`);
      outBytes = Buffer.from(await res.arrayBuffer());
    } else {
      const { removeBackground } = await import("@imgly/background-removal");
      const out = await removeBackground(new Blob([new Uint8Array(bytes)], { type: asset.mime || "image/png" }));
      outBytes = Buffer.from(await out.arrayBuffer());
    }
    if (outBytes.length < 1024) throw new Error("empty result");
    const r = await swapTransparent(jobId, outBytes, "job");
    if (!r.swapped) return { ok: false };
    return { ok: true, url: r.url };
  } catch (e) {
    const note = e instanceof Error ? e.message : "failed";
    if (note === "asset gone" || note === "R2 gone") {
      // Permanent: nothing will ever succeed.
      setJob(jobId, "failed", note);
      getDb().prepare("INSERT INTO Notification (title, body, audience, kind, target) VALUES (?,?,?,?,?)")
        .run("Background removal failed", `${note} — original image kept.`, "team", "warning", "team");
    } else {
      // Transient/engine-missing: back to queued so the client WASM worker
      // (or a keyed retry) can still win the swap.
      setJob(jobId, "queued", `engine: ${note}`);
    }
    return { ok: false };
  }
}
