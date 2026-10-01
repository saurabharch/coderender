import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { getDb, remember } from "@/lib/store";
import { scoreReply } from "@/lib/evals";
import { runNetwork } from "@/lib/agent-net";
import { rateLimited, slowDown, clientKey } from "@/lib/rate-limit";
import { humanCookie } from "@/lib/captcha";
import { checkVerifiedCookie } from "@/lib/otp";
import { banKey, isBanned, punish, scoreRequest, idemGet, idemSet, burstCount } from "@/lib/abuse";
import { threadName } from "@/lib/identity";
import { withName } from "@/lib/honorific";
import { moderate } from "@/lib/moderate";

const FALLBACK = "Thanks for reaching out! A teammate replies within one business day. For instant help, WhatsApp us from the contact page.";

function parseShortcuts(message: string): { agent?: string; topic?: string; command?: string; clean: string } {
  let agent: string | undefined;
  let topic: string | undefined;
  let command: string | undefined;
  let clean = message;
  const at = clean.match(/@(\w+)/);
  if (at && ["sales", "support", "pricing", "partner"].includes(at[1])) {
    agent = at[1];
    clean = clean.replace(at[0], "").trim();
  }
  const hash = clean.match(/#(\w[\w-]*)/);
  if (hash) {
    topic = hash[1];
    clean = clean.replace(hash[0], "").trim();
  }
  const slash = clean.match(/^\/(\w+)/);
  if (slash && ["help", "pricing", "demo", "human", "reset", "support", "partner", "enquiry", "verified"].includes(slash[1])) {
    command = slash[1];
    clean = clean.replace(slash[0], "").trim();
  }
  return { agent, topic, command, clean: clean || message };
}

export async function POST(req: Request) {
  const parsed = z.object({
    threadId: z.number().int().optional(),
    message: z.string().min(1).max(1000),
    fingerprint: z.string().max(80).optional(),
    solveMs: z.number().int().min(0).max(3600000).optional(),
    locale: z.string().max(60).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad message" }, { status: 422 });
  const cleanMsg = moderate(parsed.data.message).clean;
  const fp = parsed.data.fingerprint || req.headers.get("x-forwarded-for") || "anon";
  const locale = parsed.data.locale || "";
  const bkey = banKey(parsed.data.fingerprint, req);
  if (isBanned(bkey)) return NextResponse.json({ error: "temporarily blocked — try again later" }, { status: 403 });
  const mod = moderate(parsed.data.message);
  if (mod.verdict === "block") {
    const recent = getDb().prepare(
      "SELECT COUNT(*) c FROM BotFlag WHERE fp=? AND reason LIKE '%content-block%' AND createdAt > datetime('now','-1 hour')"
    ).get(parsed.data.fingerprint ?? "") as { c: number };
    const { flagging } = await import("@/lib/abuse");
    flagging(req, parsed.data.fingerprint, `content-block: ${mod.reasons.join("; ")}`, 70, parsed.data.locale ?? "");
    if (recent.c >= 1) {
      const mins = punish(bkey);
      return NextResponse.json({ error: `repeated violations — retry in ~${mins} min` }, { status: 403 });
    }
    return NextResponse.json({
      reply: "Let's keep it clean — I'm here to help with your business. What do you need: services, prices, or booking?",
      provider: "none", eval: 50, warned: mod.reasons,
    });
  }
  if (mod.reasons.length > 0) {
    const { flagging } = await import("@/lib/abuse");
    flagging(req, parsed.data.fingerprint, `cleaned: ${mod.reasons.join("; ")}`, 20, parsed.data.locale ?? "");
  }
  const verdict = scoreRequest({ fp: parsed.data.fingerprint, req, solveMs: parsed.data.solveMs, burstHits: burstCount(fp, req) });
  if (verdict.banned || verdict.score >= 85) {
    const mins = punish(bkey);
    return NextResponse.json({ error: `automated activity detected — retry in ~${mins} min` }, { status: 403 });
  }
  const idemKey = req.headers.get("idempotency-key");
  const replay = idemGet(idemKey);
  if (replay) return NextResponse.json({ ...JSON.parse(replay), replayed: true });
  const jar = await cookies();
  const verified = checkVerifiedCookie(jar.get("cr_verified")?.value);
  const { activeProvider } = await import("@/lib/slider-captcha");
  if (activeProvider() !== "off" && jar.get("cr_human")?.value !== humanCookie() && !verified)
    return NextResponse.json({ error: "Prove you're human first — solve the quick check in the chat." }, { status: 403 });
  if (rateLimited(clientKey(fp, req), 20, 3600_000))
    return NextResponse.json(slowDown(), { status: 429 });
  let threadId = parsed.data.threadId;
  if (threadId) {
    const own = getDb().prepare("SELECT id FROM ChatThread WHERE id=? AND userId IS NULL").get(threadId);
    if (!own) return NextResponse.json({ error: "not your thread" }, { status: 403 });
  } else {
    const r = getDb().prepare("INSERT INTO ChatThread (title, userId, fp) VALUES (?,NULL,?)")
      .run(cleanMsg.slice(0, 60), parsed.data.fingerprint ?? null);
    threadId = Number(r.lastInsertRowid);
  }
  getDb().prepare("INSERT INTO ChatMessage (threadId, role, body) VALUES (?,?,?)")
    .run(threadId, "user", cleanMsg);
  remember(threadId, "user", cleanMsg);
  try {
    getDb().prepare("INSERT INTO Event (type, path, fingerprint) VALUES (?,?,?)")
      .run("chat", "/api/chat-public", parsed.data.fingerprint ?? null);
  } catch { /* analytics never breaks chat */ }
  let reply = "";
  let provider = "none";
  let net: {
    text: string; runtime: string; source?: string; options?: { id: string; label: string }[];
    multi?: boolean; submitLabel?: string; back?: boolean; done?: boolean;
    verify?: "support" | "partner"; blocks?: unknown;
  } | null = null;
  const verifiedEmail = verified ?? undefined;
  try {
    const { agent, topic, command } = parseShortcuts(parsed.data.message);
    const second = parseShortcuts(cleanMsg);
    net = await runNetwork({
      userId: 0, message: second.clean, threadId,
      agent: second.agent ?? agent, topic: second.topic ?? topic, command: second.command ?? command,
      verifiedEmail,
    });
    if (net.runtime === "busy")
      return NextResponse.json({ error: "All agents are busy — try again in a minute." }, { status: 503 });
    if (net.text) {
      reply = net.text.slice(0, 2000);
      provider = net.runtime === "opencode-cli" ? "local-ai" : net.runtime;
    }
  } catch { /* fallback below */ }
  if (!reply) {
    reply = FALLBACK;
    getDb().prepare("INSERT INTO Vote (threadId, turnIdx, vote) VALUES (?,?,?)").run(threadId, 0, "fail");
  } else {
    reply = withName(reply, threadName(threadId));
  }
  getDb().prepare("INSERT INTO ChatMessage (threadId, role, body) VALUES (?,?,?)").run(threadId, "assistant", reply);
  remember(threadId, "assistant", reply);
  const { score, notes } = scoreReply(reply);
  getDb().prepare("INSERT INTO Eval (threadId, score, rubric) VALUES (?,?,?)").run(threadId, score, notes.join("; "));
  const turnIdx = (getDb().prepare("SELECT COUNT(*) c FROM ChatMessage WHERE threadId=? AND role='assistant'").get(threadId) as { c: number }).c;
  const out = {
    threadId, reply, provider, eval: score, turnIdx, source: net?.source,
    options: net?.options, multi: net?.multi, submitLabel: net?.submitLabel,
    back: net?.back, done: net?.done, verify: net?.verify, blocks: net?.blocks ?? undefined,
  };
  idemSet(idemKey, JSON.stringify(out));
  return NextResponse.json(out);
}
