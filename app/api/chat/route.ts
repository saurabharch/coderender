import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/store";
import { sessionUser } from "@/lib/auth";
import { scoreReply } from "@/lib/evals";
import { runNetwork } from "@/lib/agent-net";

const FALLBACK = "Thanks for reaching out! A teammate replies within one business day. For instant help, WhatsApp us from the contact page.";

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({ threadId: z.number().int().optional(), message: z.string().min(1).max(4000) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad message" }, { status: 422 });
  let threadId = parsed.data.threadId;
  if (threadId) {
    const own = getDb().prepare("SELECT id FROM ChatThread WHERE id=? AND (userId IS NULL OR userId=?)").get(threadId, user.id);
    if (!own) return NextResponse.json({ error: "not your thread" }, { status: 403 });
  } else {
    const r = getDb().prepare("INSERT INTO ChatThread (title, userId) VALUES (?,?)")
      .run(parsed.data.message.slice(0, 60), user.id);
    threadId = Number(r.lastInsertRowid);
  }
  getDb().prepare("INSERT INTO ChatMessage (threadId, role, body) VALUES (?,?,?)")
    .run(threadId, "user", parsed.data.message);

  let reply = "";
  let provider = "none";
  try {
    const net = await runNetwork({ userId: user.id, message: parsed.data.message, threadId });
    if (net.text) {
      reply = net.text.slice(0, 2000);
      provider = net.runtime === "opencode-cli" ? "local-ai" : net.runtime;
    }
  } catch { /* fallback below */ }
  if (!reply) reply = FALLBACK;
  getDb().prepare("INSERT INTO ChatMessage (threadId, role, body) VALUES (?,?,?)").run(threadId, "assistant", reply);
  const { score, notes } = scoreReply(reply);
  getDb().prepare("INSERT INTO Eval (threadId, score, rubric) VALUES (?,?,?)").run(threadId, score, notes.join("; "));
  return NextResponse.json({ threadId, reply, provider, eval: score });
}
