import { createHmac, randomBytes } from "node:crypto";
import { getDb } from "./store";

// Tiers with default commission rates (overridable per partner + prefs).
export const TIERS: Record<string, { rate: number; label: string }> = {
  referrer: { rate: 10, label: "Referrer" },
  reseller: { rate: 20, label: "Reseller" },
  city: { rate: 30, label: "City partner" },
};

export function tierRate(tier: string): number {
  const custom = Number((getDb().prepare("SELECT value FROM Preference WHERE key=?").get(`partner_rate_${tier}`) as { value: string } | undefined)?.value ?? 0) || 0;
  if (custom > 0) return custom;
  return TIERS[tier]?.rate ?? 10;
}

export function minPayout(): number {
  return Number((getDb().prepare("SELECT value FROM Preference WHERE key='partner_min_payout'").get() as { value: string } | undefined)?.value ?? 1000) || 1000;
}

export interface Partner {
  id: number; email: string; name: string; phone: string; tier: string;
  ratePercent: number; code: string; status: string;
  bankName: string; accountNo: string; ifsc: string; upi: string; bankVerified: number;
}

function newCode(prefix: string): string {
  return `${prefix}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export function createPartner(input: { email: string; name?: string; phone?: string; tier?: string }): number {
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("bad email");
  const tier = TIERS[input.tier ?? ""] ? input.tier! : "referrer";
  const r = getDb().prepare("INSERT INTO Partner (email, name, phone, tier, ratePercent, code) VALUES (?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING").run(
    email, String(input.name ?? "").slice(0, 80), String(input.phone ?? "").slice(0, 20),
    tier, TIERS[tier].rate, newCode("CRP"));
  const row = getDb().prepare("SELECT id FROM Partner WHERE email=?").get(email) as { id: number };
  void r;
  return row.id;
}

export function getPartner(id: number): Partner | null {
  return getDb().prepare("SELECT * FROM Partner WHERE id=?").get(id) as unknown as Partner | null ?? null;
}

export function partnerByCode(code: string): Partner | null {
  return getDb().prepare("SELECT * FROM Partner WHERE code=? AND status='active'").get(String(code).toUpperCase()) as unknown as Partner | null ?? null;
}

export function partnerByEmail(email: string): Partner | null {
  return getDb().prepare("SELECT * FROM Partner WHERE email=?").get(String(email).toLowerCase()) as unknown as Partner | null ?? null;
}

export function listPartners(): Partner[] {
  return getDb().prepare("SELECT * FROM Partner ORDER BY id DESC LIMIT 200").all() as unknown as Partner[];
}

export function setBanking(id: number, input: { bankName?: string; accountNo?: string; ifsc?: string; upi?: string }, verified?: boolean): void {
  const cur = getPartner(id);
  if (!cur) throw new Error("not found");
  getDb().prepare("UPDATE Partner SET bankName=?, accountNo=?, ifsc=?, upi=?, bankVerified=? WHERE id=?").run(
    input.bankName !== undefined ? String(input.bankName).slice(0, 80) : cur.bankName,
    input.accountNo !== undefined ? String(input.accountNo).slice(0, 30) : cur.accountNo,
    input.ifsc !== undefined ? String(input.ifsc).slice(0, 20).toUpperCase() : cur.ifsc,
    input.upi !== undefined ? String(input.upi).slice(0, 60) : cur.upi,
    verified !== undefined ? (verified ? 1 : 0) : cur.bankVerified, id);
}

// ---- referrals: attribute leads, accrue on PAID payments ----

export function recordReferralLead(partnerId: number, code: string, leadId: number): number {
  const r = getDb().prepare("INSERT INTO Referral (partnerId, code, leadId, period) VALUES (?,?,?,?)").run(
    partnerId, code, leadId, new Date().toISOString().slice(0, 7));
  return Number(r.lastInsertRowid);
}

export async function accrueReferral(orderId: number, amount: number): Promise<void> {
  const d = getDb();
  const order = d.prepare("SELECT leadId FROM ClientOrder WHERE id=?").get(orderId) as { leadId: number } | undefined;
  if (!order?.leadId) return;
  const lead = d.prepare("SELECT refCode FROM Lead WHERE id=?").get(order.leadId) as { refCode: string } | undefined;
  if (!lead?.refCode) return;
  const ref = d.prepare("SELECT id, partnerId FROM Referral WHERE leadId=? ORDER BY id DESC LIMIT 1").get(order.leadId) as
    { id: number; partnerId: number } | undefined;
  if (!ref) return;
  const p = d.prepare("SELECT ratePercent FROM Partner WHERE id=?").get(ref.partnerId) as { ratePercent: number } | undefined;
  const commission = Math.round(amount * (p?.ratePercent ?? 10) / 100);
  d.prepare("UPDATE Referral SET orderId=?, amount=?, commission=?, status='approved', period=? WHERE id=?").run(
    orderId, amount, commission, new Date().toISOString().slice(0, 7), ref.id);
  const { ledgerPost } = await import("./finance");
  ledgerPost({ kind: "commission", refId: ref.id, amount: commission, memo: `referral #${ref.id} partner #${ref.partnerId}` });
}

// ---- goals / milestones (gamified) ----
export const MILESTONES = [
  { code: "first-lead", name: "First referral", test: (s: { leads: number }) => s.leads >= 1 },
  { code: "ten-leads", name: "10 referrals", test: (s: { leads: number }) => s.leads >= 10 },
  { code: "first-paid", name: "First paying client", test: (s: { paid: number }) => s.paid >= 1 },
  { code: "lakh-club", name: "₹1L partner revenue", test: (s: { revenue: number }) => s.revenue >= 100000 },
] as const;

export interface PartnerStats {
  leads: number; paid: number; revenue: number; commission: number;
  day: { n: number; revenue: number }; week: { n: number; revenue: number };
  month: { n: number; revenue: number }; year: { n: number; revenue: number };
  milestones: { code: string; name: string; at: string | null }[];
  goals: { kind: string; period: string; target: number; actual: number; pct: number }[];
}

export function partnerStats(partnerId: number): PartnerStats {
  const d = getDb();
  const leads = (d.prepare("SELECT COUNT(*) c FROM Referral WHERE partnerId=?").get(partnerId) as { c: number }).c;
  const agg = d.prepare("SELECT COUNT(*) paid, COALESCE(SUM(amount),0) revenue, COALESCE(SUM(commission),0) commission FROM Referral WHERE partnerId=? AND status='approved'").get(partnerId) as
    { paid: number; revenue: number; commission: number };
  const bucket = (days: number) => d.prepare(
    `SELECT COUNT(*) n, COALESCE(SUM(amount),0) revenue FROM Referral
     WHERE partnerId=? AND createdAt >= date('now', ?) AND status='approved'`).get(partnerId, `-${days} days`) as { n: number; revenue: number };
  const w = bucket(7), m = bucket(30), y = bucket(365);
  const today = bucket(1);
  for (const ms of MILESTONES) {
    if (ms.test({ leads, paid: agg.paid, revenue: agg.revenue })) {
      d.prepare("INSERT INTO PartnerMilestone (partnerId, code) VALUES (?,?) ON CONFLICT DO NOTHING").run(partnerId, ms.code);
    }
  }
  const earned = d.prepare("SELECT code, at FROM PartnerMilestone WHERE partnerId=?").all(partnerId) as { code: string; at: string }[];
  const goals = (d.prepare("SELECT kind, period, target FROM PartnerGoal WHERE partnerId=?").all(partnerId) as { kind: string; period: string; target: number }[])
    .map((g) => {
      const span = g.kind === "day" ? 1 : g.kind === "week" ? 7 : g.kind === "year" ? 365 : 30;
      const actual = bucket(span);
      return { ...g, actual: g.period === "revenue" ? actual.revenue : actual.n, pct: g.target ? Math.min(100, Math.round(((g.period === "revenue" ? actual.revenue : actual.n) / g.target) * 100)) : 0 };
    });
  return JSON.parse(JSON.stringify({
    leads, paid: agg.paid, revenue: agg.revenue, commission: agg.commission,
    day: today, week: w, month: m, year: y,
    milestones: MILESTONES.map((ms) => ({ code: ms.code, name: ms.name, at: earned.find((e) => e.code === ms.code)?.at ?? null })),
    goals,
  }));
}

export function setGoal(partnerId: number, kind: string, period: string, target: number): void {
  if (!["day", "week", "month", "year"].includes(kind)) throw new Error("bad kind");
  if (!["clients", "revenue"].includes(period)) throw new Error("bad period");
  getDb().prepare("INSERT INTO PartnerGoal (partnerId, period, kind, target) VALUES (?,?,?,?) ON CONFLICT(partnerId, period, kind) DO UPDATE SET target=excluded.target")
    .run(partnerId, period, kind, Math.max(0, Math.round(target)));
}

// ---- payouts: request → approve → pay → partner-confirm → settled.
// Revenue counts settled payouts only. Next payout unlocks after the
// minimal goal for a CLOSED period.

export interface Payout {
  id: number; partnerId: number; period: string; amount: number; status: string;
  method: string; confirmToken: string; requestedAt: string; paidAt: string; confirmedAt: string;
}

export function periodClosed(period: string): boolean {
  // YYYY-MM (month ended) or YYYY-Www / YYYY-MM-DD windows in the past.
  const now = new Date();
  if (/^\d{4}-\d{2}$/.test(period)) {
    return new Date(`${period}-01T00:00:00Z`) < new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const d = new Date(`${period}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d < now;
}

export function periodEarnings(partnerId: number, period: string): number {
  const len = period.length === 7 ? 7 : 10;
  const key = period.slice(0, len);
  const r = getDb().prepare(
    `SELECT COALESCE(SUM(commission),0) s FROM Referral WHERE partnerId=? AND status='approved'
     AND substr(createdAt,1,?)=?`).get(partnerId, len, key) as { s: number };
  return r.s;
}

export function requestPayout(partnerId: number, period: string, actor: string): number {
  const p = getPartner(partnerId);
  if (!p) throw new Error("not found");
  if (!periodClosed(period)) throw new Error("period still open");
  const amount = periodEarnings(partnerId, period);
  if (amount < minPayout()) throw new Error(`below minimum ₹${minPayout()}`);
  const dup = getDb().prepare("SELECT id FROM Payout WHERE partnerId=? AND period=? AND status NOT IN ('settled','cancelled')").get(partnerId, period);
  if (dup) throw new Error("payout already in flight");
  const token = randomBytes(16).toString("hex");
  const r = getDb().prepare("INSERT INTO Payout (partnerId, period, amount, method, confirmToken) VALUES (?,?,?,?,?)").run(
    partnerId, period, amount, p.upi ? `upi:${p.upi}` : `bank:${p.bankName}`, token);
  const id = Number(r.lastInsertRowid);
  getDb().prepare("INSERT INTO Notification (title, body, audience) VALUES (?,?,?)").run(
    `Payout requested: ${p.email} ${period} ₹${amount}`, `by ${actor}`, "team");
  return id;
}

export function approvePayout(id: number, actor: string): void {
  const cur = getDb().prepare("SELECT status FROM Payout WHERE id=?").get(id) as { status: string } | undefined;
  if (!cur || cur.status !== "requested") throw new Error("bad state");
  getDb().prepare("UPDATE Payout SET status='approved' WHERE id=?").run(id);
  getDb().prepare("INSERT INTO Notification (title, body, audience) VALUES (?,?,?)").run(
    `Payout #${id} approved`, `by ${actor} — pay then confirm`, "team");
}

export function markPaid(id: number, actor: string, method?: string): void {
  const cur = getDb().prepare("SELECT status FROM Payout WHERE id=?").get(id) as { status: string } | undefined;
  if (!cur || cur.status !== "approved") throw new Error("approve first");
  getDb().prepare("UPDATE Payout SET status='paid', paidAt=datetime('now'), method=COALESCE(NULLIF(?,''),method) WHERE id=?").run(method ?? "", id);
  getDb().prepare("INSERT INTO Notification (title, body, audience) VALUES (?,?,?)").run(
    `Payout #${id} paid`, `awaiting partner confirmation — NOT settled yet`, "team");
}

export async function confirmPayout(token: string): Promise<{ id: number }> {
  const cur = getDb().prepare("SELECT id, status FROM Payout WHERE confirmToken=?").get(token) as
    { id: number; status: string } | undefined;
  if (!cur || cur.status !== "paid") throw new Error("nothing to confirm");
  getDb().prepare("UPDATE Payout SET status='settled', confirmedAt=datetime('now') WHERE id=?").run(cur.id);
  const { ledgerPost } = await import("./finance");
  ledgerPost({ kind: "payout", refId: cur.id, amount: 0, memo: `payout #${cur.id} settled` });
  getDb().prepare("INSERT INTO Notification (title, body, audience) VALUES (?,?,?)").run(
    `Payout #${cur.id} settled`, `partner confirmed receipt`, "team");
  return { id: cur.id };
}

export function listPayouts(partnerId?: number): Payout[] {
  const d = getDb();
  const rows = (partnerId
    ? d.prepare("SELECT * FROM Payout WHERE partnerId=? ORDER BY id DESC LIMIT 100").all(partnerId)
    : d.prepare("SELECT * FROM Payout ORDER BY id DESC LIMIT 100").all()) as unknown as Payout[];
  return rows;
}

// Daily admin digest: due payouts + milestone hits + banking to verify.
export function payoutDigest(): string[] {
  const d = getDb();
  const lines: string[] = [];
  for (const p of listPartners().filter((x) => x.status === "active")) {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const period = lastMonth.toISOString().slice(0, 7);
    const earn = periodEarnings(p.id, period);
    const pend = d.prepare("SELECT COUNT(*) c FROM Payout WHERE partnerId=? AND status NOT IN ('settled','cancelled')").get(p.id) as { c: number };
    if (earn >= minPayout() && pend.c === 0) lines.push(`${p.email}: ₹${earn} ready for ${period} (no payout in flight)`);
    if (!p.bankVerified && (earn > 0 || pend.c > 0)) lines.push(`${p.email}: banking NOT verified (${p.upi || p.accountNo || "missing"})`);
    const fresh = d.prepare("SELECT code FROM PartnerMilestone WHERE partnerId=? AND date(at)=date('now')").all(p.id) as { code: string }[];
    for (const f of fresh) lines.push(`${p.email}: milestone ${f.code} hit today`);
  }
  return lines;
}
