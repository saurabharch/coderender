import { NextResponse } from "next/server";
import { getDb } from "@/lib/store";
import { sessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const boardId = Number(new URL(req.url).searchParams.get("board") || 0);
  const rows = getDb().prepare(
    "SELECT taskId, gEventId, day, updated FROM GcalEvent WHERE taskId IN (SELECT id FROM KanbanTask WHERE boardId=?)"
  ).all(boardId) as { taskId: number; gEventId: string; day: string; updated: string }[];
  return NextResponse.json({ state: Object.fromEntries(rows.map((r) => [r.taskId, r])) });
}
