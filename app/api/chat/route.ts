import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/store";
import { sessionUser } from "@/lib/auth";
import { scoreReply } from "@/lib/evals";

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({ threadId: z.number().int().optional(), message: z.string().min(1).max(4000) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad message" }, { status: 422 });
  let threadId = parsed.data.threadId;
  if (!threadId) {
    const r = getDb().prepare("INSERT INTO ChatThread (title) VALUES (?)")
      .run(parsed.data.message.slice(0, 60));
    threadId = Number(r.lastInsertRowid);
  }
  getDb().prepare("INSERT INTO ChatMessage (threadId, role, body) VALUES (?,?,?)")
    .run(threadId, "user", parsed.data.message);

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
  const base = process.env.OPENAI_BASE_URL || (process.env.ANTHROPIC_API_KEY ? "https://api.anthropic.com" : "https://api.openai.com");
  if (!apiKey) {
    const reply = "AI is not connected here yet — set ANTHROPIC_API_KEY or OPENAI_API_KEY to enable replies. Your message is saved in this thread.";
    getDb().prepare("INSERT INTO ChatMessage (threadId, role, body) VALUES (?,?,?)").run(threadId, "assistant", reply);
    const { score, notes } = scoreReply(reply);
    getDb().prepare("INSERT INTO Eval (threadId, score, rubric) VALUES (?,?,?)").run(threadId, score, notes.join("; "));
    return NextResponse.json({ threadId, reply, provider: "none" });
  }
  try {
    const history = getDb().prepare("SELECT role, body FROM ChatMessage WHERE threadId=? ORDER BY id DESC LIMIT 10").all(threadId) as
      { role: string; body: string }[];
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o-mini",
        messages: [{ role: "system", content: "You are CodeRender's helpful agency assistant." },
          ...history.reverse().map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.body }))],
        max_tokens: 500,
      }),
    });
    if (!res.ok) throw new Error(`provider ${res.status}`);
    const data = await res.json();
    const reply = String(data.choices?.[0]?.message?.content ?? "No reply.").slice(0, 4000);
    getDb().prepare("INSERT INTO ChatMessage (threadId, role, body) VALUES (?,?,?)").run(threadId, "assistant", reply);
    const { score, notes } = scoreReply(reply);
    getDb().prepare("INSERT INTO Eval (threadId, score, rubric) VALUES (?,?,?)").run(threadId, score, notes.join("; "));
    return NextResponse.json({ threadId, reply, provider: "live", eval: score });
  } catch (e) {
    const reply = `Provider error (${(e as Error).message}). Message saved; try again later.`;
    getDb().prepare("INSERT INTO ChatMessage (threadId, role, body) VALUES (?,?,?)").run(threadId, "assistant", reply);
    return NextResponse.json({ threadId, reply, provider: "error" });
  }
}
