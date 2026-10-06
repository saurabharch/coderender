// Background removal worker: runs inside an Inngest job (server-side), never
// in the request or UI path. Original stays live until the transparent copy
// is verified — failures keep the original + notify, never a broken image.
import { readFile, writeFile } from "node:fs/promises";
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
  const db = getDb();
  const job = bgJob(jobId);
  if (!job || job.status !== "queued") return { ok: false };
  setJob(jobId, "working", "engine starting");
  try {
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
      // Dynamic: the ~40MB model downloads on first use (cached after); the
      // device only pays this inside the job, never during selling/capture.
      const { removeBackground } = await import("@imgly/background-removal");
      const out = await removeBackground(new Blob([new Uint8Array(bytes)], { type: asset.mime || "image/png" }));
      outBytes = Buffer.from(await out.arrayBuffer());
    }
    if (outBytes.length < 1024) throw new Error("empty result");
    const remote = /^https?:\/\//.test(asset.filename);
    let url: string;
    if (remote) {
      const { r2Config, r2Put } = await import("./r2");
      if (!r2Config()) throw new Error("R2 gone");
      const key = `products/nobg-${Date.now()}.png`;
      url = (await r2Put(outBytes, key, "image/png")).url;
      db.prepare("UPDATE MediaAsset SET filename=? WHERE id=?").run(url, job.assetId);
    } else {
      const name = asset.filename.replace(/(\.[a-z0-9]+)?$/i, "") + "-nobg.png";
      await writeFile(join(process.cwd(), "public", "uploads", name), outBytes);
      db.prepare("UPDATE MediaAsset SET filename=? WHERE id=?").run(name, job.assetId);
      url = `/uploads/${name}`;
    }
    // Swap every product reference old → transparent.
    if (job.productId) {
      const p = db.prepare("SELECT images FROM Product WHERE id=?").get(job.productId) as { images: string } | undefined;
      if (p) {
        const imgs = JSON.parse(p.images || "[]") as string[];
        const old = remote ? asset.filename : `/uploads/${asset.filename}`;
        const next = imgs.map((u) => (u === old ? url : u));
        if (next.join() !== imgs.join()) {
          db.prepare("UPDATE Product SET images=? WHERE id=?").run(JSON.stringify(next).slice(0, 4000), job.productId);
        }
      }
    }
    setJob(jobId, "done", url);
    db.prepare("INSERT INTO Notification (title, body, audience, kind, target) VALUES (?,?,?,?,?)")
      .run("Background removed ✓", `Transparent image live${job.productId ? ` on product #${job.productId}` : ""}.`, "team", "info", "team");
    return { ok: true, url };
  } catch (e) {
    const note = e instanceof Error ? e.message : "failed";
    setJob(jobId, "failed", note);
    getDb().prepare("INSERT INTO Notification (title, body, audience, kind, target) VALUES (?,?,?,?,?)")
      .run("Background removal failed", `${note} — original image kept.`, "team", "warning", "team");
    return { ok: false };
  }
}
