import { NextResponse } from "next/server";
import { getDb } from "@/lib/store";

// Own-device thread list (fingerprint-scoped) + single-thread loader for the switcher.
export async function GET(req: Request) {
  const fp = new URL(req.url).searchParams.get("fp") || "";
  const id = new URL(req.url).searchParams.get("id") || "";
  if (id) {
    const t = getDb().prepare("SELECT id, title FROM ChatThread WHERE id=? AND userId IS NULL AND (fp=? OR fp IS NULL)").get(Number(id), fp) as
      { id: number; title: string } | undefined;
    if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });
    const msgs = getDb().prepare("SELECT role, body FROM ChatMessage WHERE threadId=? ORDER BY id LIMIT 60").all(Number(id));
    return NextResponse.json({ thread: t, messages: msgs });
  }
  const rows = getDb().prepare(
    "SELECT t.id, t.title, MAX(m.id) lastMsg FROM ChatThread t LEFT JOIN ChatMessage m ON m.threadId=t.id WHERE t.userId IS NULL AND (t.fp=? OR t.fp IS NULL) GROUP BY t.id ORDER BY lastMsg DESC LIMIT 10"
  ).all(fp);
  return NextResponse.json({ threads: rows });
}
