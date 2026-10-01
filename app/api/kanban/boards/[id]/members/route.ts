import { NextResponse } from "next/server";
import { z } from "zod";
import { inviteMember, listMembers, removeMember } from "@/lib/kanban";
import { sessionUser } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { id } = await params;
  return NextResponse.json({ members: listMembers(Number(id)) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { id } = await params;
  const parsed = z.object({ email: z.string().max(120), role: z.enum(["member", "lead"]).optional() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad invite" }, { status: 422 });
  try {
    await inviteMember(Number(id), parsed.data.email, parsed.data.role);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: msg === "not found" ? 404 : 422 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { id } = await params;
  const email = new URL(req.url).searchParams.get("email") || "";
  await removeMember(Number(id), email);
  return NextResponse.json({ ok: true });
}
