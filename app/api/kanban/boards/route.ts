import { NextResponse } from "next/server";
import { z } from "zod";
import { createBoard, listBoards } from "@/lib/kanban";
import { sessionUser } from "@/lib/auth";

export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  return NextResponse.json({ boards: listBoards() });
}

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({
    name: z.string().min(1).max(80),
    description: z.string().max(500).optional(),
    formId: z.number().int().optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad board" }, { status: 422 });
  try {
    const id = await createBoard({ ...parsed.data, ownerEmail: user.email });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
