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
  for (const c of ["ratingAvg REAL NOT NULL DEFAULT 0", "ratingCount INTEGER NOT NULL DEFAULT 0"]) {
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
export function earnForOrder(orderId: number): void {
  try {
    crmTables();
    const o = getDb().prepare("SELECT customerId, grand FROM ShopOrder WHERE id=?").get(orderId) as
      { customerId: number; grand: number } | undefined;
    if (!o?.customerId) return;
    const pts = earnPoints(o.grand);
    if (pts <= 0) return;
    applyPoints(o.customerId, pts, `order #${orderId}`);
    logCustomer(o.customerId, "loyalty", `+${pts} pts order #${orderId}`);
  } catch { /* loyalty never breaks orders */ }
}

export function redeemPoints(customerId: number, points: number): { off: number } {
  crmTables();
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
