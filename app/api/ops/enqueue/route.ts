import { NextResponse } from "next/server";
import { z } from "zod";
import { enqueue, runQueueTick } from "@/lib/queue";
import { sessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({ kind: z.string().min(1).max(30), payload: z.record(z.string(), z.unknown()).optional() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad job" }, { status: 422 });
  try {
    const id = enqueue(parsed.data.kind, parsed.data.payload ?? {});
    const tick = await runQueueTick(5);
    return NextResponse.json({ ok: true, id, ran: tick.results });
  } catch {
    return NextResponse.json({ error: "bad kind" }, { status: 422 });
  }
}
