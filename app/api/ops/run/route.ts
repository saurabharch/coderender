import { NextResponse } from "next/server";
import { queueDepth, runQueueTick } from "@/lib/queue";
import { sessionUser } from "@/lib/auth";

export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  return NextResponse.json({ ok: true, depth: queueDepth(), ...(await runQueueTick(10)) });
}

export async function POST() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  return NextResponse.json({ ok: true, depth: queueDepth(), ...(await runQueueTick(10)) });
}
