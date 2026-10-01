import { NextResponse } from "next/server";
import { z } from "zod";
import { reorderColumns } from "@/lib/kanban";
import { sessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({ boardId: z.number().int(), ids: z.array(z.number().int()).max(50) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad order" }, { status: 422 });
  try {
    await reorderColumns(parsed.data.boardId, parsed.data.ids);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "reorder failed" }, { status: 422 });
  }
}
