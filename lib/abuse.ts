import { getDb } from "./store";
import { getClientIp } from "./client";
import { geoLabel, lookup } from "./geo";

// Bot vs human scoring + exponential bans. Signals (each weak alone, strong together):
// headless UA, missing fingerprint, inhuman captcha solve time, burst rate,
// fingerprint rotation behind one IP. Score >= 60 → flag; >= 85 → ban.
export interface BotVerdict {
  score: number;
  reasons: string[];
  banned: boolean;
}

export function banKey(fp: string | undefined, req: Request): string {
  return `${fp || "nofp"}|${getClientIp(req) || "anon"}`;
}

export function burstCount(fp: string | undefined, req: Request): number {
  const ip = getClientIp(req) || "anon";
  try {
    const r = getDb().prepare(
      `SELECT COUNT(*) c FROM Event WHERE createdAt > datetime('now','-1 minute')
       AND (fingerprint = ? OR path LIKE ?)`).get(fp ?? "§none§", `%${ip}%`) as { c: number };
    return r.c;
  } catch {
    return 0;
  }
}

export function isBanned(key: string): boolean {
  const r = getDb().prepare("SELECT until FROM RateBan WHERE key=?").get(key) as { until: number } | undefined;
  return !!r && r.until > Date.now();
}

export function punish(key: string): number {
  const d = getDb();
  const r = d.prepare("SELECT level FROM RateBan WHERE key=?").get(key) as { level: number } | undefined;
  const level = Math.min((r?.level ?? 0) + 1, 8);
  const minutes = Math.pow(2, level);
  d.prepare("INSERT INTO RateBan (key, until, level) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET until=excluded.until, level=excluded.level")
    .run(key, Date.now() + minutes * 60000, level);
  return minutes;
}

export function flagging(req: Request, fp: string | undefined, reason: string, score: number, locale = "") {
  try {
    const ip = getClientIp(req) || "";
    const geo = geoLabel(lookup(ip));
    getDb().prepare("INSERT INTO BotFlag (fp, ip, reason, score, locale) VALUES (?,?,?,?,?)")
      .run(fp ?? "", ip, reason, score, [locale.slice(0, 40), geo].filter(Boolean).join(" · ").slice(0, 120));
  } catch { /* flagging never breaks requests */ }
}

export function scoreRequest(opts: {
  fp?: string; req: Request; solveMs?: number; burstHits?: number;
}): BotVerdict {
  const reasons: string[] = [];
  let score = 0;
  const ua = opts.req.headers.get("user-agent") || "";
  if (/headless|phantom|selenium|playwright|puppeteer/i.test(ua)) {
    score += 45;
    reasons.push("headless UA");
  }
  if (!opts.fp) {
    score += 15;
    reasons.push("no fingerprint");
  }
  if (opts.solveMs !== undefined && opts.solveMs < 1200) {
    score += 30;
    reasons.push("inhuman captcha speed");
  }
  if ((opts.burstHits ?? 0) > 8) {
    score += 25;
    reasons.push("burst rate");
  }
  const key = banKey(opts.fp, opts.req);
  const banned = isBanned(key);
  if (score >= 60) flagging(opts.req, opts.fp, reasons.join("; "), score);
  return { score, reasons, banned };
}

// Idempotency: same key → replay stored response, never re-execute.
export function idemGet(key: string | null): string | null {
  if (!key) return null;
  const r = getDb().prepare("SELECT response FROM Idempotency WHERE key=? AND exp > ?").get(key, Date.now()) as
    { response: string } | undefined;
  return r?.response ?? null;
}

export function idemSet(key: string | null, response: string) {
  if (!key) return;
  try {
    getDb().prepare("INSERT INTO Idempotency (key, response, exp) VALUES (?,?,?) ON CONFLICT(key) DO NOTHING")
      .run(key, response.slice(0, 8000), Date.now() + 24 * 3600_000);
  } catch { /* ignore */ }
}
