import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";
import { sessionUser } from "@/lib/auth";

// List recent chats the bot has seen (message the bot first, then detect).
export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const cfg = getProvider("telegram");
  if (!cfg.TELEGRAM_BOT_TOKEN) return NextResponse.json({ error: "save bot token first" }, { status: 422 });
  try {
    const res = await fetch(`https://api.telegram.org/bot${cfg.TELEGRAM_BOT_TOKEN}/getUpdates?limit=50&timeout=10`, { signal: AbortSignal.timeout(20000) });
    const data = await res.json().catch(() => ({}));
    const seen = new Map<string, { id: string; name: string }>();
    for (const u of data?.result ?? []) {
      const c = u.message?.chat ?? u.channel_post?.chat;
      if (!c?.id) continue;
      const name = [c.title, c.first_name, c.username ? `@${c.username}` : ""].filter(Boolean).join(" ");
      seen.set(String(c.id), { id: String(c.id), name: name || String(c.id) });
    }
    return NextResponse.json({ chats: [...seen.values()] });
  } catch {
    return NextResponse.json({ error: "telegram unreachable" }, { status: 502 });
  }
}
