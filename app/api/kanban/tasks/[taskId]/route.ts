import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteTask, updateTask } from "@/lib/kanban";
import { sessionUser } from "@/lib/auth";

const schema = z.object({
  title: z.string().min(1).max(160).optional(),
  body: z.string().max(4000).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assigneeEmail: z.string().max(120).optional(),
  archived: z.boolean().optional(),
  attachments: z.array(z.string().max(500)).max(10).optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { taskId } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad task" }, { status: 422 });
  try {
    await updateTask(Number(taskId), parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: msg === "not found" ? 404 : 422 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { taskId } = await params;
  await deleteTask(Number(taskId));
  return NextResponse.json({ ok: true });
}
