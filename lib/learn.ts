import { getDb } from "./store";
import { embed, cosine } from "./vectors";
import { redact } from "./ai-gateway";

const MAX_NIGHTLY = 5;

// Candidates: downvoted turns, low-eval replies, and fallback ("teammate replies") answers.
interface Candidate {
  input: string;
  weak: string;
}

export function collectCandidates(limit = MAX_NIGHTLY): Candidate[] {
  const d = getDb();
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const push = (input: string, weak: string) => {
    const key = input.slice(0, 120);
    if (!key.trim() || seen.has(key) || out.length >= limit) return;
    seen.add(key);
    out.push({ input: input.slice(0, 500), weak: weak.slice(0, 500) });
  };
  try {
    const downs = d.prepare(
      "SELECT threadId, turnIdx FROM Vote WHERE vote='down' ORDER BY id DESC LIMIT 20").all() as
      { threadId: number; turnIdx: number }[];
    for (const v of downs) {
      const msgs = d.prepare("SELECT role, body FROM ChatMessage WHERE threadId=? ORDER BY id").all(v.threadId) as
        { role: string; body: string }[];
      const ai = msgs.filter((m) => m.role === "assistant");
      const weak = ai[v.turnIdx - 1]?.body;
      const users = msgs.filter((m) => m.role === "user");
      if (weak && users.length) push(users[users.length - 1].body, weak);
      if (out.length >= limit) break;
    }
  } catch { /* ignore */ }
  try {
    const lows = d.prepare(
      `SELECT e.threadId AS tid FROM Eval e WHERE e.score < 60 ORDER BY e.id DESC LIMIT ${limit}`).all() as
      { tid: number }[];
    for (const r of lows) {
      const weak = d.prepare("SELECT body FROM ChatMessage WHERE threadId=? AND role='assistant' ORDER BY id DESC LIMIT 1").get(r.tid) as { body: string } | undefined;
      const q = d.prepare("SELECT body FROM ChatMessage WHERE threadId=? AND role='user' ORDER BY id DESC LIMIT 1").get(r.tid) as { body: string } | undefined;
      if (q?.body && weak?.body) push(q.body, weak.body);
      if (out.length >= limit) break;
    }
  } catch { /* ignore */ }
  return out;
}

export async function distillOnce(input: string, weak: string): Promise<string | null> {
  const { infer } = await import("./ai-gateway");
  const clean = redact(input);
  const r = await infer({
    scope: "support",
    userId: 0,
    system: "You are a senior conversation designer improving a support bot. Rewrite a better reply: warm, specific, accurate, ends with one clear next step. Never promise rankings, revenue, or virality. Reply with ONLY the improved message, 1–3 sentences.",
    user: `Customer said: ${clean}\nWeak reply was: ${redact(weak).slice(0, 500)}`,
  });
  const text = r.text.trim().slice(0, 1000);
  return text || null;
}

export async function runNightlyDistill(max = MAX_NIGHTLY): Promise<{ distilled: number }> {
  const cands = collectCandidates(max);
  let distilled = 0;
  for (const c of cands) {
    const better = await distillOnce(c.input, c.weak).catch(() => null);
    if (!better) continue;
    try {
      const dup = getDb().prepare("SELECT id FROM Distill WHERE input=?").get(c.input);
      if (dup) continue;
      getDb().prepare("INSERT INTO Distill (input, better, source, score) VALUES (?,?,?,?)")
        .run(c.input, better, "nightly", 70);
      distilled++;
    } catch { /* ignore */ }
  }
  // prune: keep the freshest 200
  try {
    getDb().prepare("DELETE FROM Distill WHERE id NOT IN (SELECT id FROM Distill ORDER BY id DESC LIMIT 200)").run();
  } catch { /* ignore */ }
  return { distilled };
}

// Retrieval: best exemplar above threshold, else null. Increments uses.
export function retrieveExemplar(query: string, threshold = 0.3): { better: string; id: number } | null {  try {
    const q = embed(query);
    const rows = getDb().prepare("SELECT id, input, better FROM Distill ORDER BY id DESC LIMIT 200").all() as
      { id: number; input: string; better: string }[];
    let best: { id: number; better: string; s: number } | null = null;
    for (const r of rows) {
      const s = cosine(q, embed(r.input));
      if (s > threshold && (!best || s > best.s)) best = { id: r.id, better: r.better, s };
    }
    if (!best) return null;
    getDb().prepare("UPDATE Distill SET uses = uses + 1 WHERE id=?").run(best.id);
    return { better: best.better, id: best.id };
  } catch {
    return null;
  }
}
