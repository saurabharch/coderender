import { NextResponse } from "next/server";
import { z } from "zod";
import { commentOwner, deleteComment, editComment } from "@/lib/comments";
import { sessionUser } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = z.object({ body: z.string().min(2).max(2000) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad edit" }, { status: 422 });
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const own = commentOwner(Number(id));
  if (!own) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (own.authorEmail !== user.email) return NextResponse.json({ error: "not yours" }, { status: 403 });
  await editComment(Number(id), parsed.data.body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const own = commentOwner(Number(id));
  if (!own) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (own.authorEmail !== user.email) return NextResponse.json({ error: "not yours" }, { status: 403 });
  await deleteComment(Number(id));
  return NextResponse.json({ ok: true });
}
