import { NextResponse } from "next/server";
import { z } from "zod";
import { connectStatus, pullDay, setConnection } from "@/lib/gcal";
import { getBoard } from "@/lib/kanban";
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
    const { enqueue, runQueueTick } = await import("@/lib/queue");
    const jobId = enqueue("gcal.push", { boardId: board.id, email: user.email });
    const tick = await runQueueTick(3);
    return NextResponse.json({ ok: true, jobId, ran: tick.results });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "sync failed" }, { status: 502 });
  }
}
