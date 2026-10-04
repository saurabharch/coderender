import { NextResponse } from "next/server";
import { z } from "zod";
import { listConversations, markRead, thread } from "@/lib/wa-crm";
import { sessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const phone = new URL(req.url).searchParams.get("phone") || "";
  if (phone) {
    markRead(phone);
    return NextResponse.json({ thread: thread(phone) });
  }
  return NextResponse.json({ conversations: listConversations() });
}

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({ phone: z.string().min(10).max(20), body: z.string().min(1).max(2000) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad reply" }, { status: 422 });
  const { replyTo } = await import("@/lib/wa-crm");
  const r = await replyTo(parsed.data.phone, parsed.data.body, user.email);
  return r.ok ? NextResponse.json({ ok: true, via: r.detail }) : NextResponse.json({ error: r.detail }, { status: 422 });
}
