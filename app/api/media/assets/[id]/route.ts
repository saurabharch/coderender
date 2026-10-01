import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { deleteAsset, updateAsset } from "@/lib/media";
import { sessionUser } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { id } = await params;
  const parsed = z.object({ alt: z.string().max(160).optional(), folder: z.string().max(80).optional() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad asset" }, { status: 422 });
  try {
    await updateAsset(Number(id), parsed.data);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { id } = await params;
  try {
    const { filename } = await deleteAsset(Number(id));
    if (filename) await unlink(join(process.cwd(), "public", "uploads", filename)).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
