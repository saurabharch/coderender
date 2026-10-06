import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { sessionUser } from "@/lib/auth";
import { getDb } from "@/lib/store";
import { ALLOWED_MIME, MAX_BYTES } from "@/lib/media";

const VIDEO_MIME = ["video/mp4", "video/webm"];
const VIDEO_MAX = 25 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file") as File | null;
  const isVideo = file ? VIDEO_MIME.includes(file.type) : false;
  const cap = isVideo ? VIDEO_MAX : MAX_BYTES;
  if (!file || (!ALLOWED_MIME.includes(file.type) && !isVideo) || file.size > cap)
    return NextResponse.json({ error: "png/jpg/webp/gif/svg up to 2MB, mp4/webm up to 25MB" }, { status: 422 });
  const folder = String(form?.get("folder") ?? "").slice(0, 80);
  const alt = String(form?.get("alt") ?? "").slice(0, 160);
  const ext = (file.name.split(".").pop() || "bin").slice(0, 8).replace(/[^a-z0-9]/gi, "");
  const bytes = Buffer.from(await file.arrayBuffer());
  // Organized storage: products/{id}/{slug}-{ts}.ext locally, mirrored on R2.
  const productId = Number(form?.get("productId") || 0);
  let prodName = "item";
  if (productId) {
    const p = getDb().prepare("SELECT name FROM Product WHERE id=?").get(productId) as { name: string } | undefined;
    if (p?.name) prodName = p.name;
  }
  const { productFile } = await import("@/lib/bgremove");
  const rel = productFile(productId, prodName, ext || "bin");
  // R2 when configured (dashboard vault), local /uploads otherwise — offline-first.
  let url = `/uploads/${rel}`;
  let via = "local";
  let storedName = rel;
  try {
    const { r2Config, r2Put } = await import("@/lib/r2");
    if (r2Config()) {
      const r = await r2Put(bytes, rel, file.type);
      url = r.url; via = r.via; storedName = r.url;
    }
  } catch (e) {
    if (via !== "local") return NextResponse.json({ error: e instanceof Error ? e.message : "R2 failed" }, { status: 422 });
  }
  if (via === "local") {
    const { mkdir } = await import("node:fs/promises");
    const { join, dirname } = await import("node:path");
    const dir = join(process.cwd(), "public", "uploads", dirname(rel));
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${rel.split("/").pop()}`), bytes);
  }
  const r = getDb().prepare("INSERT INTO MediaAsset (filename, mime, size, folder, alt) VALUES (?,?,?,?,?)")
    .run(storedName, file.type, file.size, folder, alt);
  // Optional: attach straight to a product (caps: 10 images, 3 videos).
  if (productId) {
    const { getProductFull } = await import("@/lib/commerce");
    const full = getProductFull(productId) as { product: Record<string, string> } | null;
    if (full) {
      const imgs = JSON.parse(full.product.images || "[]") as string[];
      const vids = JSON.parse(full.product.videos || "[]") as string[];
      if (isVideo && vids.length >= 3) return NextResponse.json({ error: "max 3 videos per product" }, { status: 422 });
      if (!isVideo && imgs.length >= 10) return NextResponse.json({ error: "max 10 images per product" }, { status: 422 });
      const col = isVideo ? "videos" : "images";
      const next = JSON.stringify([...(isVideo ? vids : imgs), url].slice(0, isVideo ? 3 : 10));
      getDb().prepare(`UPDATE Product SET ${col}=? WHERE id=?`).run(next, productId);
    }
  }
  return NextResponse.json({ ok: true, url, via, id: Number(r.lastInsertRowid) });
}
