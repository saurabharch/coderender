import { NextResponse } from "next/server";
import { queueDepth, runQueueTick } from "@/lib/queue";
import { sessionUser } from "@/lib/auth";

export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  return NextResponse.json({ ok: true, depth: queueDepth(), ...(await runQueueTick(10)) });
}

export async function POST(req: Request) {
  // Compose worker path: Bearer WORKER_TICK_TOKEN (Linux only). When the
  // token is unset this branch is dead and session auth applies as before.
  const want = process.env.WORKER_TICK_TOKEN || "";
  if (want && req.headers.get("authorization") === `Bearer ${want}`) {
    return NextResponse.json({ ok: true, depth: queueDepth(), ...(await runQueueTick(10)) });
  }
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  return NextResponse.json({ ok: true, depth: queueDepth(), ...(await runQueueTick(10)) });
}
