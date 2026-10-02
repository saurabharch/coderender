import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteBoard, getBoard, updateBoard } from "@/lib/kanban";
import { sessionUser } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { id } = await params;
  const board = getBoard(Number(id));
  if (!board) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ board });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { id } = await params;
  const parsed = z.object({
    name: z.string().min(1).max(80).optional(),
    description: z.string().max(500).optional(),
    formId: z.number().int().nullable().optional(),
    ownerEmail: z.string().max(120).optional(),
    clientLeadId: z.number().int().nullable().optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad board" }, { status: 422 });
  try {
    await updateBoard(Number(id), parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: msg === "not found" ? 404 : 422 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { id } = await params;
  await deleteBoard(Number(id));
  return NextResponse.json({ ok: true });
}
