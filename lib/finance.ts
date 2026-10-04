// Finance ledger, Bigcapital-flavoured: every money event posts balanced
// journal entries (debit = credit); revenue and payouts count only when
// settled/paid. Invoices, receipts, and payout transcripts render as
// printable documents. Optional Autumn passthrough when AUTUMN_API_KEY
// is set (same events mirrored; local ledger stays source of truth).
import { getDb } from "./store";

export type EntryKind = "invoice" | "payment" | "commission" | "payout" | "refund" | "adjust";

export function ledgerPost(input: { kind: EntryKind; refId: number; amount: number; memo?: string; account?: string }): number {
  const d = getDb();
  d.exec(`CREATE TABLE IF NOT EXISTS JournalEntry (
    id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, refId INTEGER NOT NULL DEFAULT 0,
    debit TEXT NOT NULL DEFAULT '', credit TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL DEFAULT 0,
    memo TEXT NOT NULL DEFAULT '', at TEXT NOT NULL DEFAULT (datetime('now')))`);
  const r = d.prepare("INSERT INTO JournalEntry (kind, refId, debit, credit, amount, memo) VALUES (?,?,?,?,?,?)").run(
    input.kind, input.refId, input.account ?? accountFor(input.kind, "debit"),
    input.account ?? accountFor(input.kind, "credit"), Math.round(input.amount), String(input.memo ?? "").slice(0, 500));
  void autumnMirror(input.kind, input.refId, input.amount);
  return Number(r.lastInsertRowid);
}

function accountFor(kind: EntryKind, side: "debit" | "credit"): string {
  const map: Record<string, [string, string]> = {
    invoice: ["receivable", "revenue"],
    payment: ["cash", "receivable"],
    commission: ["commission-expense", "partner-payable"],
    payout: ["partner-payable", "cash"],
    refund: ["revenue", "cash"],
    adjust: ["suspense", "suspense"],
  };
  const [debit, credit] = map[kind] ?? ["suspense", "suspense"];
  return side === "debit" ? debit : credit;
}

async function autumnMirror(kind: string, refId: number, amount: number): Promise<void> {
  const key = process.env.AUTUMN_API_KEY;
  if (!key) return;
  try {
    await fetch("https://api.useautumn.com/v1/events", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ customer_id: "coderender", event_name: `cr_${kind}`, properties: { refId, amount } }),
    });
  } catch { /* mirror never breaks books */ }
}

export function trialBalance(): { account: string; debit: number; credit: number }[] {
  const rows = getDb().prepare("SELECT debit, credit, amount FROM JournalEntry").all() as
    { debit: string; credit: string; amount: number }[];
  const map = new Map<string, { debit: number; credit: number }>();
  for (const r of rows) {
    const d = map.get(r.debit) ?? { debit: 0, credit: 0 };
    d.debit += r.amount;
    map.set(r.debit, d);
    const c = map.get(r.credit) ?? { debit: 0, credit: 0 };
    c.credit += r.amount;
    map.set(r.credit, c);
  }
  return [...map.entries()].map(([account, v]) => ({ account, ...v })).sort((a, b) => a.account.localeCompare(b.account));
}

export function ledgerBalances(): { account: string; balance: number }[] {
  const rows = getDb().prepare("SELECT debit, credit, amount FROM JournalEntry").all() as
    { debit: string; credit: string; amount: number }[];
  const bal = new Map<string, number>();
  for (const r of rows) {
    bal.set(r.debit, (bal.get(r.debit) ?? 0) + r.amount);
    bal.set(r.credit, (bal.get(r.credit) ?? 0) - r.amount);
  }
  return [...bal.entries()].map(([account, balance]) => ({ account, balance })).sort((a, b) => a.account.localeCompare(b.account));
}

export function settledRevenue(): number {
  const r = getDb().prepare(
    `SELECT COALESCE(SUM(amount),0) s FROM JournalEntry WHERE kind='payment'`).get() as { s: number };
  return r.s;
}

// Single writer for payments: row + ledger + referral accrual stay atomic.
export async function recordPayment(orderId: number, amount: number, method: string, status: string): Promise<number> {
  const d = getDb();
  const m = ["upi", "cash", "card"].includes(method) ? method : "upi";
  const st = status === "paid" ? "paid" : "pending";
  const r = d.prepare("INSERT INTO Payment (orderId, amount, method, status) VALUES (?,?,?,?)").run(
    orderId, Math.max(0, Math.round(amount)), m, st);
  const pid = Number(r.lastInsertRowid);
  if (st === "paid") {
    ledgerPost({ kind: "payment", refId: pid, amount: Math.max(0, Math.round(amount)), memo: `order #${orderId}` });
    const { accrueReferral } = await import("./partners");
    await accrueReferral(orderId, Math.max(0, Math.round(amount)));
  }
  return pid;
}

export interface InvoiceDoc {
  no: string; kind: "INVOICE" | "RECEIPT" | "PAYOUT-TRANSCRIPT";
  date: string; billTo: string; lines: { label: string; amount: number }[];
  total: number; status: string; memo: string;
}

export function invoiceForOrder(orderId: number): InvoiceDoc | null {
  const d = getDb();
  const o = d.prepare("SELECT * FROM ClientOrder WHERE id=?").get(orderId) as
    { id: number; title: string; amount: number; status: string; leadId: number } | undefined;
  if (!o) return null;
  const lead = o.leadId ? d.prepare("SELECT name, phone FROM Lead WHERE id=?").get(o.leadId) as
    { name: string; phone: string } | undefined : undefined;
  const paid = d.prepare("SELECT COALESCE(SUM(amount),0) s FROM Payment WHERE orderId=? AND status='paid'").get(orderId) as { s: number };
  return {
    no: `INV-${String(o.id).padStart(5, "0")}`, kind: "INVOICE", date: new Date().toISOString().slice(0, 10),
    billTo: lead ? `${lead.name} · ${lead.phone}` : "Client",
    lines: [{ label: o.title, amount: o.amount }],
    total: o.amount, status: paid.s >= o.amount ? "paid" : `due ₹${o.amount - paid.s}`,
    memo: `Order #${o.id} (${o.status})`,
  };
}

export function receiptForPayment(paymentId: number): InvoiceDoc | null {
  const d = getDb();
  const p = d.prepare("SELECT * FROM Payment WHERE id=?").get(paymentId) as
    { id: number; orderId: number; amount: number; method: string; status: string } | undefined;
  if (!p) return null;
  const o = d.prepare("SELECT title, leadId FROM ClientOrder WHERE id=?").get(p.orderId) as
    { title: string; leadId: number } | undefined;
  const lead = o?.leadId ? d.prepare("SELECT name FROM Lead WHERE id=?").get(o.leadId) as { name: string } | undefined : undefined;
  return {
    no: `RCP-${String(p.id).padStart(5, "0")}`, kind: "RECEIPT", date: new Date().toISOString().slice(0, 10),
    billTo: lead?.name ?? "Client",
    lines: [{ label: `${o?.title ?? "Order"} via ${p.method}`, amount: p.amount }],
    total: p.amount, status: p.status, memo: `Payment #${p.id} for order #${p.orderId}`,
  };
}

export function transcriptForPayout(payoutId: number): InvoiceDoc | null {
  const d = getDb();
  const p = d.prepare(`SELECT p.*, pt.email FROM Payout p LEFT JOIN Partner pt ON pt.id=p.partnerId WHERE p.id=?`).get(payoutId) as
    { id: number; partnerId: number; period: string; amount: number; status: string; method: string; email: string; paidAt: string; confirmedAt: string } | undefined;
  if (!p) return null;
  return {
    no: `PAY-${String(p.id).padStart(5, "0")}`, kind: "PAYOUT-TRANSCRIPT", date: new Date().toISOString().slice(0, 10),
    billTo: `${p.email ?? `partner #${p.partnerId}`} via ${p.method || "—"}`,
    lines: [{ label: `Partner earnings ${p.period}`, amount: p.amount }],
    total: p.amount, status: p.status,
    memo: `paid ${p.paidAt || "—"} · confirmed ${p.confirmedAt || "—"}`,
  };
}
