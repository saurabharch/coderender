import { NextResponse } from "next/server";
import { z } from "zod";
import { moveTask } from "@/lib/kanban";
import { sessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({
    taskId: z.number().int(),
    columnId: z.number().int(),
    index: z.number().int().min(0).max(500).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad move" }, { status: 422 });
  try {
    await moveTask(parsed.data.taskId, parsed.data.columnId, parsed.data.index);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "move failed" }, { status: 422 });
  }
}
