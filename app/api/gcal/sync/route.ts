import { NextResponse } from "next/server";
import { z } from "zod";
import { connectStatus, pullDay, pushTask, setConnection } from "@/lib/gcal";
import { designationOf, getBoard } from "@/lib/kanban";
import { taskDay } from "@/lib/calendar-core";
import { sessionUser } from "@/lib/auth";

export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  return NextResponse.json(connectStatus(user.email));
}

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({
    action: z.enum(["push", "pull", "off"]),
    boardId: z.number().int().optional(),
    day: z.string().max(10).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad sync" }, { status: 422 });
  const { action } = parsed.data;
  if (action === "off") {
    setConnection(user.email, { syncOn: false });
    return NextResponse.json({ ok: true });
  }
  const st = connectStatus(user.email);
  if (!st.configured) return NextResponse.json({ error: "google keys missing", configured: false }, { status: 422 });
  if (!st.connected) return NextResponse.json({ error: "connect google first" }, { status: 422 });
  try {
    if (action === "pull") {
      const day = parsed.data.day || new Date().toISOString().slice(0, 10);
      return NextResponse.json({ ok: true, events: await pullDay(user.email, day) });
    }
    const board = getBoard(Number(parsed.data.boardId || 0));
    if (!board) return NextResponse.json({ error: "no board" }, { status: 404 });
    const pushed: string[] = [];
    for (const t of board.tasks.filter((x) => !x.archived)) {
      const day = taskDay({ dueAt: t.dueAt, doneAt: t.doneAt, createdAt: t.createdAt });
      await pushTask(user.email, {
        id: t.id, title: t.title, body: t.body.slice(0, 500), day,
        assigneeEmail: t.assigneeEmail, designation: designationOf(t.assigneeEmail), done: !!t.doneAt,
      });
      pushed.push(`${t.id}@${day}`);
    }
    return NextResponse.json({ ok: true, pushed });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "sync failed" }, { status: 502 });
  }
}
