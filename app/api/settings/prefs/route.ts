import { NextResponse } from "next/server";
import { z } from "zod";
import { getPref, setPref } from "@/lib/store";
import { sessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const key = String(new URL(req.url).searchParams.get("key") || "").slice(0, 80);
  if (!key) return NextResponse.json({ error: "bad key" }, { status: 422 });
  return NextResponse.json({ key, value: getPref(key, "") });
}

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({ key: z.string().min(1).max(80), value: z.string().max(4000) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad pref" }, { status: 422 });
  if (!/^(channel_kill_|sla_|partner_|captcha_|daily_|learning)/.test(parsed.data.key))
    return NextResponse.json({ error: "key not adjustable here" }, { status: 403 });
  setPref(parsed.data.key, parsed.data.value);
  return NextResponse.json({ ok: true });
}
