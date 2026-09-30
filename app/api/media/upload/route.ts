import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { sessionUser } from "@/lib/auth";
import { getDb } from "@/lib/store";

const MAX = 2 * 1024 * 1024;
const OK = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file") as File | null;
  if (!file || !OK.includes(file.type) || file.size > MAX)
    return NextResponse.json({ error: "png/jpg/webp/gif/svg up to 2MB" }, { status: 422 });
  const ext = (file.name.split(".").pop() || "bin").slice(0, 8).replace(/[^a-z0-9]/gi, "");
  const filename = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()));
  getDb().prepare("INSERT INTO MediaAsset (filename, mime, size) VALUES (?,?,?)").run(filename, file.type, file.size);
  return NextResponse.json({ ok: true, url: `/uploads/${filename}` });
}
