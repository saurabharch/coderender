import { NextResponse } from "next/server";
import { z } from "zod";
import { rescheduleMeeting } from "@/lib/notify";
import { sessionUser } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { id } = await params;
  const parsed = z.object({ slot: z.string().min(3).max(120) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad slot" }, { status: 422 });
  try {
    const { meeting, oldSlot, report } = await rescheduleMeeting(Number(id), parsed.data.slot, user.email);
    return NextResponse.json({ ok: true, meeting, oldSlot, report });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: msg === "not found" ? 404 : 422 });
  }
}
