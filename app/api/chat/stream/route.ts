import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, remember } from "@/lib/store";
import { sessionUser } from "@/lib/auth";
import { scoreReply } from "@/lib/evals";
import { runNetwork } from "@/lib/agent-net";
import { onBeforeChat, onAfterChat, onErrorChat } from "@/lib/chat-hooks";
import { inferStream } from "@/lib/ai-gateway";

// Team streaming endpoint (SSE): token events + done envelope with eval/tools.
export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({ threadId: z.number().int().optional(), message: z.string().min(1).max(2000) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad message" }, { status: 422 });
  const denied = await onBeforeChat({ userId: user.id });
  if (denied) return NextResponse.json({ error: denied }, { status: 429 });

  let threadId = parsed.data.threadId;
  if (threadId) {
    const own = getDb().prepare("SELECT id FROM ChatThread WHERE id=? AND userId=?").get(threadId, user.id);
    if (!own) return NextResponse.json({ error: "not your thread" }, { status: 403 });
  } else {
    const r = getDb().prepare("INSERT INTO ChatThread (title, userId) VALUES (?,?)")
      .run(parsed.data.message.slice(0, 60), user.id);
    threadId = Number(r.lastInsertRowid);
  }
  getDb().prepare("INSERT INTO ChatMessage (threadId, role, body) VALUES (?,?,?)")
    .run(threadId, "user", parsed.data.message);
  remember(threadId, "user", parsed.data.message);

  const started = Date.now();
  const toolsUsed: string[] = ["router"];
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        const net = await runNetwork({ userId: user.id, message: parsed.data.message, threadId });
        if (net.text) {
          // stream in word chunks for smooth UX (gateway streams internally too)
          for (const w of net.text.split(/(\s+)/)) {
            send({ token: w });
            await new Promise((r) => setTimeout(r, 12));
          }
          toolsUsed.push("kb", "briefing");
        }
        getDb().prepare("INSERT INTO ChatMessage (threadId, role, body) VALUES (?,?,?)").run(threadId, "assistant", net.text || "(no reply)");
        remember(threadId, "assistant", net.text || "");
        const { score } = scoreReply(net.text || "");
        getDb().prepare("INSERT INTO Eval (threadId, score, rubric) VALUES (?,?,?)").run(threadId, score, "stream");
        await onAfterChat({ threadId, userId: user.id, ms: Date.now() - started, tools: toolsUsed, ok: !!net.text });
        send({ done: true, threadId, eval: score, tools: toolsUsed });
      } catch {
        await onErrorChat({ threadId });
        send({ error: "chat failed" });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
