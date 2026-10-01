import { NextResponse } from "next/server";
import { deleteSubmission, getSubmission } from "@/lib/forms";
import { sessionUser } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; subId: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { id, subId } = await params;
  const sub = getSubmission(Number(id), Number(subId));
  if (!sub) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ submission: sub });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; subId: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { id, subId } = await params;
  await deleteSubmission(Number(id), Number(subId));
  return NextResponse.json({ ok: true });
}
