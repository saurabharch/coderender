import { NextResponse } from "next/server";
import { z } from "zod";
import { createColumn } from "@/lib/kanban";
import { sessionUser } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { id } = await params;
  const parsed = z.object({ name: z.string().min(1).max(40) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad column" }, { status: 422 });
  try {
    const colId = await createColumn(Number(id), parsed.data.name);
    return NextResponse.json({ ok: true, id: colId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: msg === "not found" ? 404 : 422 });
  }
}
