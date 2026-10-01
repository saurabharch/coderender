import { NextResponse } from "next/server";
import { sessionUser } from "@/lib/auth";
import { broadcastPush, pushReady } from "@/lib/push";
import { getDb } from "@/lib/store";

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  if (!pushReady()) return NextResponse.json({ error: "VAPID keys not configured" }, { status: 503 });
  const count = (getDb().prepare("SELECT COUNT(*) c FROM PushSubscription").get() as { c: number }).c;
  const r = await broadcastPush("CodeRender test", `Hello ${user.email.split("@")[0]} — push is working. ${count} subscriber(s).`);
  return NextResponse.json({ ok: true, ...r });
}
