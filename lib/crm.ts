// CRM + loyalty + reviews + owner cockpit. Reads orders/bills/payments for
// timeline, segments and CLV — no duplication, those libs stay untouched.
import { getDb } from "./store";
import {
  clv, earnPoints, redeemValue, segmentOf, stageCan, tierFor,
  type CrmStage, type Segment,
} from "./crm-core";

export function crmTables(): void {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS CustomerEvent (id INTEGER PRIMARY KEY AUTOINCREMENT, customerId INTEGER NOT NULL, kind TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', at TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS LoyaltyAcct (customerId INTEGER PRIMARY KEY, points INTEGER NOT NULL DEFAULT 0, lifetime INTEGER NOT NULL DEFAULT 0, tier TEXT NOT NULL DEFAULT 'silver')`);
  db.exec(`CREATE TABLE IF NOT EXISTS LoyaltyTx (id INTEGER PRIMARY KEY AUTOINCREMENT, customerId INTEGER NOT NULL, delta INTEGER NOT NULL DEFAULT 0, reason TEXT NOT NULL DEFAULT '', at TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS Review (id INTEGER PRIMARY KEY AUTOINCREMENT, productId INTEGER NOT NULL DEFAULT 0, customerId INTEGER NOT NULL DEFAULT 0, rating INTEGER NOT NULL DEFAULT 5, title TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS LoyaltyCard (cardNo TEXT PRIMARY KEY, customerId INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1, issuedAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS CustomerSub (id INTEGER PRIMARY KEY AUTOINCREMENT, customerId INTEGER NOT NULL, productId INTEGER NOT NULL DEFAULT 0, qty REAL NOT NULL DEFAULT 1, cycle TEXT NOT NULL DEFAULT 'monthly', price INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active', startedAt TEXT NOT NULL DEFAULT (datetime('now')), renewsAt TEXT NOT NULL DEFAULT (datetime('now')), lastBilledAt TEXT NOT NULL DEFAULT '')`);  for (const c of ["ratingAvg REAL NOT NULL DEFAULT 0", "ratingCount INTEGER NOT NULL DEFAULT 0"]) {
    try { db.exec(`ALTER TABLE Product ADD COLUMN ${c}`); } catch { /* exists */ }
  }
  try { db.exec("ALTER TABLE Customer ADD COLUMN stage TEXT NOT NULL DEFAULT 'lead'"); } catch { /* exists */ }
}

export function logCustomer(customerId: number, kind: string, detail = ""): void {
  crmTables();
  getDb().prepare("INSERT INTO CustomerEvent (customerId, kind, detail) VALUES (?,?,?)")
    .run(customerId, kind.slice(0, 40), detail.slice(0, 500));
}

export function setStage(customerId: number, to: CrmStage): void {
  crmTables();
  const db = getDb();
  const c = db.prepare("SELECT stage FROM Customer WHERE id=?").get(customerId) as { stage: string } | undefined;
  if (!c) throw new Error("no customer");
  if (!stageCan(c.stage, to)) throw new Error(`${c.stage} → ${to} not allowed`);
  db.prepare("UPDATE Customer SET stage=? WHERE id=?").run(to, customerId);
  logCustomer(customerId, `stage:${to}`, `${c.stage} → ${to}`);
}

export interface TimelineItem { at: string; kind: string; detail: string }

export function timeline(customerId: number): TimelineItem[] {
  crmTables();
  const db = getDb();
  const items: TimelineItem[] = [];
  for (const e of db.prepare("SELECT kind, detail, at FROM CustomerEvent WHERE customerId=? ORDER BY id DESC LIMIT 30").all(customerId) as { kind: string; detail: string; at: string }[])
    items.push({ at: e.at, kind: e.kind, detail: e.detail });
  for (const o of db.prepare("SELECT id, grand, status, createdAt FROM ShopOrder WHERE customerId=? ORDER BY id DESC LIMIT 20").all(customerId) as { id: number; grand: number; status: string; createdAt: string }[])
    items.push({ at: o.createdAt, kind: "order", detail: `#${o.id} ₹${(o.grand / 100).toFixed(0)} · ${o.status}` });
  for (const b of db.prepare("SELECT no, grand, status, createdAt FROM BillDoc WHERE customerId=? ORDER BY id DESC LIMIT 20").all(customerId) as { no: string; grand: number; status: string; createdAt: string }[])
    items.push({ at: b.createdAt, kind: "bill", detail: `${b.no} ₹${(b.grand / 100).toFixed(0)} · ${b.status}` });
  return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 40);
}

export function customerOrders(customerId: number): { grand: number; at: string }[] {
  crmTables();
  return getDb().prepare("SELECT grand, createdAt at FROM ShopOrder WHERE customerId=? AND status!='cancelled' ORDER BY id").all(customerId) as
    { grand: number; at: string }[];
}

export function segment(customerId: number): { segment: Segment; spend: number; orders: number } {
  const orders = customerOrders(customerId);
  return { segment: segmentOf(orders), spend: clv(orders), orders: orders.length };
}

export function segmentList(want: Segment, limit = 50): { id: number; name: string; phone: string; spend: number }[] {
  crmTables();
  const out: { id: number; name: string; phone: string; spend: number }[] = [];
  for (const c of getDb().prepare("SELECT id, name, phone FROM Customer ORDER BY id DESC LIMIT 500").all() as { id: number; name: string; phone: string }[]) {
    const s = segment(c.id);
    if (s.segment === want) out.push({ ...c, spend: s.spend });
    if (out.length >= limit) break;
  }
  return out;
}

// ---- loyalty ----
export function loyaltyOf(customerId: number) {
  crmTables();
  const r = getDb().prepare("SELECT points, lifetime, tier FROM LoyaltyAcct WHERE customerId=?").get(customerId) as
    { points: number; lifetime: number; tier: string } | undefined;
  return r ?? { points: 0, lifetime: 0, tier: "silver" };
}

function applyPoints(customerId: number, delta: number, reason: string): void {
  const db = getDb();
  const cur = loyaltyOf(customerId);
  const points = Math.max(0, cur.points + delta);
  const lifetime = cur.lifetime + Math.max(0, delta);
  db.prepare("INSERT INTO LoyaltyAcct (customerId, points, lifetime, tier) VALUES (?,?,?,?) ON CONFLICT(customerId) DO UPDATE SET points=excluded.points, lifetime=excluded.lifetime, tier=excluded.tier")
    .run(customerId, points, lifetime, tierFor(lifetime));
  db.prepare("INSERT INTO LoyaltyTx (customerId, delta, reason) VALUES (?,?,?)").run(customerId, delta, reason.slice(0, 200));
}

// Earn on paid orders; called from order-confirm path (guarded, never throws).
export async function earnForOrder(orderId: number): Promise<void> {
  try {
    crmTables();
    const { flagOn } = await import("./flags");
    if (!flagOn("loyalty")) return;
    const o = getDb().prepare("SELECT customerId, grand FROM ShopOrder WHERE id=?").get(orderId) as
      { customerId: number; grand: number } | undefined;
    if (!o?.customerId) return;
    const pts = earnPoints(o.grand);
    if (pts <= 0) return;
    applyPoints(o.customerId, pts, `order #${orderId}`);
    logCustomer(o.customerId, "loyalty", `+${pts} pts order #${orderId}`);
  } catch { /* loyalty never breaks orders */ }
}

export async function redeemPoints(customerId: number, points: number): Promise<{ off: number }> {
  crmTables();
  const { flagOn } = await import("./flags");
  if (!flagOn("loyalty")) throw new Error("loyalty is off");
  const cur = loyaltyOf(customerId);
  const use = Math.min(Math.max(0, Math.round(points)), cur.points);
  if (use <= 0) throw new Error("no points to redeem");
  applyPoints(customerId, -use, "redeemed at checkout");
  return { off: redeemValue(use) };
}

// Revoke points earned for an order (cancel/return shield). Never throws.
export function revokeForOrder(orderId: number): void {
  try {
    crmTables();
    const o = getDb().prepare("SELECT customerId, grand FROM ShopOrder WHERE id=?").get(orderId) as
      { customerId: number; grand: number } | undefined;
    if (!o?.customerId) return;
    const pts = earnPoints(o.grand);
    if (pts <= 0) return;
    applyPoints(o.customerId, -pts, `revoked order #${orderId}`);
    logCustomer(o.customerId, "loyalty", `-${pts} pts revoked order #${orderId}`);
  } catch { /* loyalty never breaks orders */ }
}

// ---- loyalty cards (card-no → customer → manual discount) ----
export function issueCard(customerId: number): { cardNo: string } {
  crmTables();
  const db = getDb();
  if (!db.prepare("SELECT id FROM Customer WHERE id=?").get(customerId)) throw new Error("no customer");
  const ex = db.prepare("SELECT cardNo FROM LoyaltyCard WHERE customerId=? AND active=1").get(customerId) as
    { cardNo: string } | undefined;
  if (ex) return { cardNo: ex.cardNo };
  for (let i = 0; i < 5; i++) {
    const cardNo = `LC${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 36).toString(36).toUpperCase()}`;
    try {
      db.prepare("INSERT INTO LoyaltyCard (cardNo, customerId) VALUES (?,?)").run(cardNo, customerId);
      return { cardNo };
    } catch { /* collision — retry */ }
  }
  throw new Error("issue failed, retry");
}

export function cardCustomer(cardNo: string) {
  crmTables();
  const db = getDb();
  const c = db.prepare(`SELECT cu.id, cu.name, cu.phone FROM LoyaltyCard lc JOIN Customer cu ON cu.id=lc.customerId
    WHERE lc.cardNo=? AND lc.active=1`).get(cardNo.trim().toUpperCase()) as
    { id: number; name: string; phone: string } | undefined;
  return c ?? null;
}

// ---- reviews ----
export function listReviews(status = "", limit = 50) {
  crmTables();
  return getDb().prepare(status
    ? `SELECT r.*, p.name product, c.name customer FROM Review r LEFT JOIN Product p ON p.id=r.productId LEFT JOIN Customer c ON c.id=r.customerId WHERE r.status=? ORDER BY r.id DESC LIMIT ?`
    : `SELECT r.*, p.name product, c.name customer FROM Review r LEFT JOIN Product p ON p.id=r.productId LEFT JOIN Customer c ON c.id=r.customerId ORDER BY r.id DESC LIMIT ?`)
    .all(...(status ? [status, limit] : [limit]));
}

export function saveReview(input: { productId?: number; customerId?: number; rating: number; title?: string; body?: string }): number {
  crmTables();
  const r = Math.max(1, Math.min(5, Math.round(input.rating)));
  const id = Number(getDb().prepare("INSERT INTO Review (productId, customerId, rating, title, body) VALUES (?,?,?,?,?)")
    .run(input.productId ?? 0, input.customerId ?? 0, r, (input.title ?? "").slice(0, 120), (input.body ?? "").slice(0, 2000)).lastInsertRowid);
  if (r <= 2) {
    getDb().prepare("INSERT INTO Notification (title, body, audience, kind, target) VALUES (?,?,?,?,?)")
      .run(`Negative review (${r}★)`, `Review #${id} needs attention.`, "team", "warning", "team");
  }
  refreshProductRating(input.productId ?? 0);
  return id;
}

export function moderateReview(id: number, to: "approved" | "spam"): void {
  crmTables();
  if (!["approved", "spam"].includes(to)) throw new Error("bad status");
  getDb().prepare("UPDATE Review SET status=? WHERE id=?").run(to, id);
  const r = getDb().prepare("SELECT productId FROM Review WHERE id=?").get(id) as { productId: number } | undefined;
  refreshProductRating(r?.productId ?? 0);
}

// Rating rollup lives here (not commerce) to avoid a lib cycle:
// approved-only average straight onto the product row.
function refreshProductRating(productId: number): void {
  if (!productId) return;
  try {
    const r = getDb().prepare("SELECT COUNT(*) n, COALESCE(AVG(rating),0) a FROM Review WHERE productId=? AND status='approved'").get(productId) as
      { n: number; a: number };
    getDb().prepare("UPDATE Product SET ratingAvg=?, ratingCount=? WHERE id=?").run(Math.round(r.a * 10) / 10, r.n, productId);
  } catch { /* products table may predate rating columns on very old DBs — commerceTables backfills */ }
}

// ---- owner cockpit ----
export interface Attention { level: "red" | "amber" | "yellow" | "green"; text: string; href: string }

export function attentionFeed(): Attention[] {
  crmTables();
  const db = getDb();
  const out: Attention[] = [];
  const oos = (db.prepare(`SELECT COUNT(*) c FROM Product p LEFT JOIN StockLevel s ON s.productId=p.id AND s.warehouseId=1
    WHERE p.kind='physical' AND p.status='active' AND COALESCE(s.qty,0) <= 0`).get() as { c: number }).c;
  if (oos > 0) out.push({ level: "red", text: `${oos} products out of stock`, href: "/admin/stock" });
  const recv = (db.prepare(`SELECT COALESCE(SUM(CASE WHEN status='paid' THEN grand ELSE 0 END),0) paid,
    COALESCE(SUM(CASE WHEN status IN ('sent','overdue') THEN grand ELSE 0 END),0) due FROM BillDoc`).get() as
    { paid: number; due: number });
  if (recv.due > 0) out.push({ level: "amber", text: `₹${(recv.due / 100).toFixed(0)} receivables open`, href: "/admin/billing" });
  const supp = (db.prepare("SELECT COUNT(*) c FROM SupplierBill WHERE status='unpaid'").get() as { c: number }).c;
  if (supp > 0) out.push({ level: "amber", text: `${supp} supplier bills unpaid`, href: "/admin/stock" });
  const dormant = segmentList("dormant", 1000).length;
  if (dormant > 0) out.push({ level: "yellow", text: `${dormant} dormant customers (90d+) — win them back`, href: "/admin/crm" });
  const today = (db.prepare("SELECT COALESCE(SUM(grand),0) s FROM ShopOrder WHERE date(createdAt)=date('now') AND status!='cancelled'").get() as { s: number }).s;
  const avg7 = (db.prepare("SELECT COALESCE(AVG(d),0) a FROM (SELECT SUM(grand) d FROM ShopOrder WHERE date(createdAt) >= date('now','-7 days') AND status!='cancelled' GROUP BY date(createdAt))").get() as { a: number }).a;
  if (today > 0 && avg7 > 0) {
    const pct = Math.round(((today - avg7) / avg7) * 100);
    if (Math.abs(pct) >= 10) out.push({ level: pct > 0 ? "green" : "yellow", text: `Today ${pct > 0 ? "+" : ""}${pct}% vs 7-day average`, href: "/admin" });
  }
  if (!out.length) out.push({ level: "green", text: "All clear — nothing needs attention", href: "/admin" });
  return out;
}

// ---- subscriptions (recurring billing; collection stays manual) ----
function nextRenewal(cycle: string, from = ""): string {
  const base = from ? new Date(`${from}T00:00:00Z`) : new Date();
  const days = cycle === "yearly" ? 365 : 30;
  return new Date(base.getTime() + days * 86400_000).toISOString().slice(0, 10);
}

export function subscribe(input: { customerId: number; productId: number; qty?: number; cycle?: string }): number {
  crmTables();
  const db = getDb();
  const c = db.prepare("SELECT id FROM Customer WHERE id=?").get(input.customerId);
  if (!c) throw new Error("no customer");
  const p = db.prepare("SELECT id, price FROM Product WHERE id=? AND status='active'").get(input.productId) as
    { id: number; price: number } | undefined;
  if (!p) throw new Error("no product");
  const cycle = input.cycle === "yearly" ? "yearly" : "monthly";
  const today = new Date().toISOString().slice(0, 10);
  return Number(db.prepare(`INSERT INTO CustomerSub
    (customerId, productId, qty, cycle, price, startedAt, renewsAt) VALUES (?,?,?,?,?,?,?)`)
    .run(input.customerId, p.id, Math.max(0.001, input.qty ?? 1), cycle, p.price, today, nextRenewal(cycle, today)).lastInsertRowid);
}

export function listSubs(status = "") {
  crmTables();
  const db = getDb();
  return db.prepare(status
    ? `SELECT s.*, c.name customer, p.name product FROM CustomerSub s
       LEFT JOIN Customer c ON c.id=s.customerId LEFT JOIN Product p ON p.id=s.productId
       WHERE s.status=? ORDER BY s.id DESC LIMIT 50`
    : `SELECT s.*, c.name customer, p.name product FROM CustomerSub s
       LEFT JOIN Customer c ON c.id=s.customerId LEFT JOIN Product p ON p.id=s.productId
       ORDER BY s.id DESC LIMIT 50`).all(...(status ? [status] : []));
}

export function cancelSub(id: number): void {
  crmTables();
  getDb().prepare("UPDATE CustomerSub SET status='cancelled' WHERE id=?").run(id);
}

function notifyTeam(title: string, body: string): void {
  try {
    getDb().prepare("INSERT INTO Notification (title, body, audience) VALUES (?,?,?)").run(title, body.slice(0, 500), "team");
  } catch { /* notify table missing — billing never breaks */ }
}

// Bill one subscription now: confirmed order + pending payment + notify.
// Failures are reported, never thrown — the tick must continue.
export async function billSub(id: number, today = ""): Promise<number | null> {
  crmTables();
  const db = getDb();
  const s = db.prepare("SELECT * FROM CustomerSub WHERE id=?").get(id) as
    { id: number; customerId: number; productId: number; qty: number; cycle: string; status: string } | undefined;
  if (!s || s.status !== "active") return null;
  const day = today || new Date().toISOString().slice(0, 10);
  try {
    const { createOrder, setOrderStatus, getOrder } = await import("./commerce");
    const { recordPayment } = await import("./finance");
    const oid = await createOrder({
      customerId: s.customerId, lines: [{ productId: s.productId, qty: s.qty }],
      channel: "subscription", notes: `subscription #${s.id}`,
    });
    await setOrderStatus(oid, "confirmed");
    const got = getOrder(oid) as { order: { grand: number } } | null;
    await recordPayment(oid, got?.order.grand ?? 0, "upi", "pending");
    db.prepare("UPDATE CustomerSub SET renewsAt=?, lastBilledAt=? WHERE id=?")
      .run(nextRenewal(s.cycle, day), day, s.id);
    notifyTeam(`Subscription billed #${s.id}`, `Order #${oid} · collect via POS/udhari`);
    return oid;
  } catch (e) {
    notifyTeam(`Subscription billing failed #${s.id}`, e instanceof Error ? e.message : "failed");
    return null;
  }
}

// Daily tick: bill every due subscription. Returns billed order ids.
export async function subTick(today = ""): Promise<number[]> {
  crmTables();
  const day = today || new Date().toISOString().slice(0, 10);
  const due = getDb().prepare("SELECT id FROM CustomerSub WHERE status='active' AND renewsAt <= ? ORDER BY id LIMIT 100").all(day) as
    { id: number }[];
  const out: number[] = [];
  for (const d of due) {
    const oid = await billSub(d.id, day);
    if (oid) out.push(oid);
  }
  return out;
}
