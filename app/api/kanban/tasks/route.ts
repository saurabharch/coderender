import { NextResponse } from "next/server";
import { z } from "zod";
import { createTask } from "@/lib/kanban";
import { sessionUser } from "@/lib/auth";

const schema = z.object({
  boardId: z.number().int(),
  columnId: z.number().int().optional(),
  title: z.string().min(1).max(160),
  body: z.string().max(4000).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assigneeEmail: z.string().max(120).optional(),
  submissionId: z.number().int().optional(),
  attachments: z.array(z.string().max(500)).max(10).optional(),
  startAt: z.string().max(16).optional(),
  dueAt: z.string().max(16).optional(),
});
export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad task" }, { status: 422 });
  try {
    const id = await createTask(parsed.data.boardId, parsed.data);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: msg === "not found" ? 404 : 422 });
  }
}
