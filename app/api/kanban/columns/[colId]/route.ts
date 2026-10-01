import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteColumn, updateColumn } from "@/lib/kanban";
import { sessionUser } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ colId: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { colId } = await params;
  const parsed = z.object({ name: z.string().min(1).max(40) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad column" }, { status: 422 });
  try {
    await updateColumn(Number(colId), parsed.data.name);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "failed" }, { status: 422 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ colId: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { colId } = await params;
  try {
    await deleteColumn(Number(colId));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: msg === "not found" ? 404 : 422 });
  }
}
