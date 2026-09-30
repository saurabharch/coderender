import { getDb } from "./store";

// Real-data account snapshots. Clients match by phone, partners by phone.
// Everything returned here already exists in our own tables — never third-party data.
export function clientSnapshot(phone: string) {
  const d = getDb();
  const leads = d.prepare("SELECT id, businessType, source, status, createdAt FROM Lead WHERE phone=? ORDER BY id DESC LIMIT 20").all(phone) as
    { id: number; businessType: string; source: string; status: string; createdAt: string }[];
  const leadIds = leads.map((l) => l.id);
  const orders = leadIds.length ? d.prepare(
    `SELECT o.*, COALESCE((SELECT SUM(amount) FROM Payment p WHERE p.orderId=o.id AND p.status='paid'),0) paid
     FROM ClientOrder o WHERE o.leadId IN (${leadIds.map(() => "?").join(",")}) ORDER BY o.id DESC`).all(...leadIds) as
    { id: number; title: string; amount: number; status: string; paid: number }[] : [];
  const appts = d.prepare("SELECT slot, mode, status FROM Appointment WHERE contact=? ORDER BY id DESC LIMIT 10").all(phone) as
    { slot: string; mode: string; status: string }[];
  const done = orders.filter((o) => o.status === "done").length;
  const completion = orders.length ? Math.round((done / orders.length) * 100) : 0;
  return { leads: leads.length, orders, paidTotal: orders.reduce((s, o) => s + o.paid, 0), completion, appts };
}

export function ticketsFor(email: string) {
  return getDb().prepare("SELECT id, subject, status, createdAt FROM Ticket WHERE email=? ORDER BY id DESC LIMIT 10").all(email.trim().toLowerCase()) as
    { id: number; subject: string; status: string; createdAt: string }[];
}

function partnerRate(tier: string): number {
  try {
    const r = getDb().prepare("SELECT value FROM Preference WHERE key='partner_plan'").get() as { value: string } | undefined;
    if (!r) return 10;
    const plan = JSON.parse(r.value) as { tier: string; commission: number }[];
    return plan.find((t) => t.tier === tier)?.commission ?? 10;
  } catch {
    return 10;
  }
}

export function partnerSnapshot(phone: string) {
  const d = getDb();
  const req = d.prepare("SELECT * FROM PartnerRequest WHERE phone=? ORDER BY id DESC LIMIT 1").get(phone) as
    { tier: string; status: string } | undefined;
  const referred = (d.prepare("SELECT COUNT(*) c FROM Lead WHERE source='partner'").get() as { c: number }).c;
  const paid = (d.prepare("SELECT COALESCE(SUM(amount),0) s FROM Payment WHERE status='paid'").get() as { s: number }).s;
  const rate = partnerRate(req?.tier ?? "referrer");
  const pending = (d.prepare("SELECT COUNT(*) c FROM PartnerRequest WHERE status='new'").get() as { c: number }).c;
  const outstanding = (d.prepare("SELECT COALESCE(SUM(amount),0) s FROM Payment WHERE status='pending'").get() as { s: number }).s;
  return {
    tier: req?.tier ?? "not applied yet", status: req?.status ?? "—",
    referredClients: referred, revenuePaid: paid,
    estimatedShare: Math.round(paid * rate / 100), tasksPending: pending, outstanding,
  };
}
