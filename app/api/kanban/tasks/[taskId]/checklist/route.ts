import { NextResponse } from "next/server";
import { z } from "zod";
import { addChecklist, deleteChecklist, editChecklist, listChecklist, moveChecklist, toggleChecklist } from "@/lib/todos";
import { sessionUser } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { taskId } = await params;
  return NextResponse.json({ items: listChecklist(Number(taskId)) });
}

export async function POST(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { taskId } = await params;
  const parsed = z.object({ label: z.string().min(1).max(160) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad item" }, { status: 422 });
  try {
    const id = addChecklist(Number(taskId), parsed.data.label);
    return NextResponse.json({ ok: true, id });
  } catch {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }
}

export async function PUT(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({
    id: z.number().int(), done: z.boolean().optional(),
    label: z.string().min(1).max(160).optional(), note: z.string().max(1000).optional(),
    dir: z.enum(["up", "down"]).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad toggle" }, { status: 422 });
  const d = parsed.data;
  try {
    if (d.dir) moveChecklist(d.id, d.dir === "up" ? -1 : 1);
    else {
      if (d.label !== undefined || d.note !== undefined) editChecklist(d.id, { label: d.label, note: d.note });
      if (d.done !== undefined) toggleChecklist(d.id, d.done);
      if (d.label === undefined && d.note === undefined && d.done === undefined)
        return NextResponse.json({ error: "nothing to change" }, { status: 422 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}

export async function DELETE(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const id = Number(new URL(req.url).searchParams.get("id") || 0);
  deleteChecklist(id);
  return NextResponse.json({ ok: true });
}
