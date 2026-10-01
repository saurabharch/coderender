import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteComment, moderateComment } from "@/lib/comments";
import { sessionUser } from "@/lib/auth";

// Team moderation: approve / spam / delete any comment.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { id } = await params;
  const parsed = z.object({ status: z.enum(["pending", "approved", "spam"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad status" }, { status: 422 });
  try {
    await moderateComment(Number(id), parsed.data.status);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { id } = await params;
  await deleteComment(Number(id));
  return NextResponse.json({ ok: true });
}
