// Money docs: numbered bills, banking, expenses, assets, refunds.
// Posts into the finance ledger (ledgerPost) — never a parallel book.
import { getDb } from "./store";
import { DOC_PREFIX, formatDocNo, refundable, type DocType } from "./billing-core";
import { ledgerPost } from "./finance";

export function billingTables(): void {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS DocSeq (type TEXT NOT NULL, year INTEGER NOT NULL, next INTEGER NOT NULL DEFAULT 1, PRIMARY KEY (type, year))`);
  db.exec(`CREATE TABLE IF NOT EXISTS BillDoc (id INTEGER PRIMARY KEY AUTOINCREMENT, no TEXT NOT NULL UNIQUE, type TEXT NOT NULL, customerId INTEGER NOT NULL DEFAULT 0, orderId INTEGER NOT NULL DEFAULT 0, lines TEXT NOT NULL DEFAULT '[]', subtotal INTEGER NOT NULL DEFAULT 0, discount INTEGER NOT NULL DEFAULT 0, tax INTEGER NOT NULL DEFAULT 0, grand INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft', notes TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS BankAccount (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'cash', opening INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1)`);
  db.exec(`CREATE TABLE IF NOT EXISTS BankTx (id INTEGER PRIMARY KEY AUTOINCREMENT, accountId INTEGER NOT NULL, kind TEXT NOT NULL, amount INTEGER NOT NULL DEFAULT 0, ref TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', at TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS Expense (id INTEGER PRIMARY KEY AUTOINCREMENT, head TEXT NOT NULL, amount INTEGER NOT NULL DEFAULT 0, vendor TEXT NOT NULL DEFAULT '', billRef TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', notes TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS Asset (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, value INTEGER NOT NULL DEFAULT 0, depPct REAL NOT NULL DEFAULT 0, purchasedAt TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '')`);
  db.exec(`CREATE TABLE IF NOT EXISTS Refund (id INTEGER PRIMARY KEY AUTOINCREMENT, paymentId INTEGER NOT NULL, orderId INTEGER NOT NULL DEFAULT 0, amount INTEGER NOT NULL DEFAULT 0, reason TEXT NOT NULL DEFAULT '', method TEXT NOT NULL DEFAULT 'upi', at TEXT NOT NULL DEFAULT (datetime('now')))`);
  if ((db.prepare("SELECT COUNT(*) c FROM BankAccount").get() as { c: number }).c === 0) {
    db.prepare("INSERT INTO BankAccount (name, kind) VALUES (?,?)").run("Cash Drawer", "cash");
  }
}

export function nextDocNo(type: DocType): string {
  billingTables();
  const db = getDb();
  const year = new Date().getFullYear();
  const row = db.prepare("SELECT next FROM DocSeq WHERE type=? AND year=?").get(type, year) as { next: number } | undefined;
  const seq = row?.next ?? 1;
  db.prepare("INSERT INTO DocSeq (type, year, next) VALUES (?,?,?) ON CONFLICT(type, year) DO UPDATE SET next=excluded.next")
    .run(type, year, seq + 1);
  return formatDocNo(DOC_PREFIX[type], year, seq);
}

// ---- bills ----
export interface BillInput {
  type: DocType; customerId?: number; orderId?: number;
  lines: { label: string; qty: number; price: number }[]; discount?: number; tax?: number; notes?: string;
}

export function createBill(input: BillInput): { id: number; no: string } {
  billingTables();
  const db = getDb();
  const lines = input.lines.slice(0, 50).map((l) => ({
    label: l.label.slice(0, 150), qty: l.qty, price: Math.max(0, Math.round(l.price)),
  }));
  if (!lines.length) throw new Error("empty bill");
  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const discount = Math.min(subtotal, Math.max(0, Math.round(input.discount ?? 0)));
  const tax = Math.max(0, Math.round(input.tax ?? 0));
  const no = nextDocNo(input.type);
  const id = Number(db.prepare(`INSERT INTO BillDoc (no, type, customerId, orderId, lines, subtotal, discount, tax, grand, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(no, input.type, input.customerId ?? 0, input.orderId ?? 0,
    JSON.stringify(lines), subtotal, discount, tax, subtotal - discount + tax, (input.notes ?? "").slice(0, 500)).lastInsertRowid);
  return { id, no };
}

export function billFromOrder(orderId: number, type: DocType = "invoice"): { id: number; no: string } {
  billingTables();
  const db = getDb();
  const o = db.prepare("SELECT * FROM ShopOrder WHERE id=?").get(orderId) as
    { id: number; customerId: number; subtotal: number; discount: number; tax: number; grand: number } | undefined;
  if (!o) throw new Error("no order");
  const lines = db.prepare("SELECT name, qty, price FROM OrderLine WHERE orderId=?").all(orderId) as
    { name: string; qty: number; price: number }[];
  const r = createBill({
    type, customerId: o.customerId, orderId,
    lines: lines.map((l) => ({ label: l.name, qty: l.qty, price: l.price })),
    discount: o.discount, tax: o.tax,
  });
  // Keep the bill total identical to the order grand.
  db.prepare("UPDATE BillDoc SET grand=? WHERE id=?").run(o.grand, r.id);
  return r;
}

export function getBill(id: number) {
  billingTables();
  const db = getDb();
  const bill = db.prepare(`SELECT b.*, c.name customer, c.phone, c.email FROM BillDoc b LEFT JOIN Customer c ON c.id=b.customerId WHERE b.id=?`).get(id);
  return bill ?? null;
}

export function listBills(status = "", limit = 50) {
  billingTables();
  return getDb().prepare(status
    ? "SELECT * FROM BillDoc WHERE status=? ORDER BY id DESC LIMIT ?"
    : "SELECT * FROM BillDoc ORDER BY id DESC LIMIT ?").all(...(status ? [status, limit] : [limit]));
}

export function setBillStatus(id: number, to: string): void {
  billingTables();
  const ok = ["draft", "sent", "paid", "overdue", "cancelled"];
  if (!ok.includes(to)) throw new Error("bad status");
  const db = getDb();
  const b = db.prepare("SELECT status, grand, no FROM BillDoc WHERE id=?").get(id) as
    { status: string; grand: number; no: string } | undefined;
  if (!b) throw new Error("no bill");
  if (b.status === "paid" || b.status === "cancelled") throw new Error(`${b.status} is final`);
  db.prepare("UPDATE BillDoc SET status=? WHERE id=?").run(to, id);
  if (to === "sent") ledgerPost({ kind: "invoice", refId: id, amount: b.grand, memo: b.no });
}

export async function sendBill(id: number, channel: "email" | "whatsapp"): Promise<string> {
  billingTables();
  const b = getBill(id) as
    { no: string; type: string; grand: number; status: string; phone: string; email: string; customer: string } | null;
  if (!b) throw new Error("no bill");
  const text = `${b.type} ${b.no}: ₹${(b.grand / 100).toFixed(0)}${b.customer ? ` for ${b.customer}` : ""} — CodeRender`;
  if (channel === "email") {
    if (!b.email) throw new Error("customer has no email");
    const { sendMail } = await import("./mailer");
    await sendMail(b.email, `${b.type} ${b.no}`, `<p>${text}</p>`);
    return `emailed to ${b.email}`;
  }
  if (!b.phone) throw new Error("customer has no phone");
  const { sendWhatsApp } = await import("./providers");
  const r = await sendWhatsApp(b.phone, text);
  if (!r.sent) throw new Error(`whatsapp not delivered (${r.via})`);
  return `whatsapp sent`;
}

// ---- banking ----
export function listAccounts() {
  billingTables();
  const db = getDb();
  return (db.prepare("SELECT * FROM BankAccount ORDER BY id").all() as
    { id: number; name: string; kind: string; opening: number; active: number }[]).map((a) => ({
    ...a,
    balance: a.opening + (db.prepare("SELECT COALESCE(SUM(CASE WHEN kind='in' THEN amount ELSE -amount END),0) b FROM BankTx WHERE accountId=?").get(a.id) as { b: number }).b,
  }));
}

export function saveAccount(input: { id?: number; name: string; kind?: string; opening?: number; active?: boolean }): number {
  billingTables();
  const db = getDb();
  const kind = ["cash", "bank", "upi", "wallet"].includes(input.kind ?? "") ? input.kind! : "cash";
  if (input.id) {
    db.prepare("UPDATE BankAccount SET name=?, kind=?, active=? WHERE id=?")
      .run(input.name.slice(0, 80), kind, input.active === false ? 0 : 1, input.id);
    return input.id;
  }
  return Number(db.prepare("INSERT INTO BankAccount (name, kind, opening) VALUES (?,?,?)")
    .run(input.name.slice(0, 80), kind, Math.round(input.opening ?? 0)).lastInsertRowid);
}

export function bankMove(accountId: number, kind: "in" | "out", amount: number, ref = "", notes = ""): number {
  billingTables();
  if (amount <= 0) throw new Error("amount must be positive");
  return Number(getDb().prepare("INSERT INTO BankTx (accountId, kind, amount, ref, notes) VALUES (?,?,?,?,?)")
    .run(accountId, kind, Math.round(amount), ref.slice(0, 120), notes.slice(0, 300)).lastInsertRowid);
}

export function bankTransfer(fromId: number, toId: number, amount: number, notes = ""): void {
  billingTables();
  if (fromId === toId) throw new Error("same account");
  if (amount <= 0) throw new Error("amount must be positive");
  bankMove(fromId, "out", amount, `transfer→${toId}`, notes);
  bankMove(toId, "in", amount, `transfer←${fromId}`, notes);
}

// ---- expenses ----
export function listExpenses(status = "") {
  billingTables();
  return getDb().prepare(status
    ? "SELECT * FROM Expense WHERE status=? ORDER BY id DESC LIMIT 50"
    : "SELECT * FROM Expense ORDER BY id DESC LIMIT 50").all(...(status ? [status] : []));
}

export function saveExpense(input: { head: string; amount: number; vendor?: string; billRef?: string; notes?: string }): number {
  billingTables();
  return Number(getDb().prepare("INSERT INTO Expense (head, amount, vendor, billRef, notes) VALUES (?,?,?,?,?)")
    .run(input.head.slice(0, 80), Math.max(1, Math.round(input.amount)), (input.vendor ?? "").slice(0, 120),
      (input.billRef ?? "").slice(0, 60), (input.notes ?? "").slice(0, 500)).lastInsertRowid);
}

export function setExpenseStatus(id: number, to: "approved" | "paid" | "rejected", accountId = 1): void {
  billingTables();
  const db = getDb();
  const e = db.prepare("SELECT status, amount, head FROM Expense WHERE id=?").get(id) as
    { status: string; amount: number; head: string } | undefined;
  if (!e) throw new Error("no expense");
  if (e.status === "paid") throw new Error("already paid");
  db.prepare("UPDATE Expense SET status=? WHERE id=?").run(to, id);
  if (to === "paid") {
    bankMove(accountId, "out", e.amount, `expense#${id}`, e.head);
    ledgerPost({ kind: "adjust", refId: id, amount: e.amount, memo: `expense: ${e.head}` });
  }
}

// ---- assets ----
export function listAssets() {
  billingTables();
  return getDb().prepare("SELECT * FROM Asset ORDER BY id DESC").all();
}

export function saveAsset(input: { name: string; value: number; depPct?: number; purchasedAt?: string; notes?: string }): number {
  billingTables();
  return Number(getDb().prepare("INSERT INTO Asset (name, value, depPct, purchasedAt, notes) VALUES (?,?,?,?,?)")
    .run(input.name.slice(0, 120), Math.max(0, Math.round(input.value)), Math.max(0, Math.min(100, input.depPct ?? 0)),
      (input.purchasedAt ?? "").slice(0, 10), (input.notes ?? "").slice(0, 500)).lastInsertRowid);
}

// ---- refunds ----
export function refundPayment(paymentId: number, amount: number, reason = "", method = "upi"): number {
  billingTables();
  const db = getDb();
  const p = db.prepare("SELECT orderId, amount, status FROM Payment WHERE id=?").get(paymentId) as
    { orderId: number; amount: number; status: string } | undefined;
  if (!p) throw new Error("no payment");
  if (p.status !== "paid") throw new Error("only paid payments refund");
  const done = (db.prepare("SELECT COALESCE(SUM(amount),0) s FROM Refund WHERE paymentId=?").get(paymentId) as { s: number }).s;
  const chk = refundable(p.amount, done, Math.round(amount));
  if (!chk.ok) throw new Error(chk.reason);
  const id = Number(db.prepare("INSERT INTO Refund (paymentId, orderId, amount, reason, method) VALUES (?,?,?,?,?)")
    .run(paymentId, p.orderId, chk.amount, reason.slice(0, 300), method.slice(0, 20)).lastInsertRowid);
  if (chk.amount >= p.amount - done) db.prepare("UPDATE Payment SET status='refunded' WHERE id=?").run(paymentId);
  ledgerPost({ kind: "refund", refId: id, amount: chk.amount, memo: `payment #${paymentId}` });
  return id;
}

export function listRefunds() {
  billingTables();
  return getDb().prepare("SELECT * FROM Refund ORDER BY id DESC LIMIT 50").all();
}
