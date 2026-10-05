// Commerce foundation: units, tax, coupons, customers, products, orders.
// Reuses ledger/notify/flows by event — catalog (services/packages) untouched.
// Money in paise; math lives in commerce-core.
import { getDb } from "./store";
import { couponOff, orderCan, quoteCart, type CouponDef, type Quote } from "./commerce-core";

export function commerceTables(): void {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS Unit (name TEXT PRIMARY KEY, kind TEXT NOT NULL DEFAULT 'pc', factor INTEGER NOT NULL DEFAULT 1)`);
  db.exec(`CREATE TABLE IF NOT EXISTS TaxRate (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, pct REAL NOT NULL DEFAULT 0, inter INTEGER NOT NULL DEFAULT 0, inclusive INTEGER NOT NULL DEFAULT 1, active INTEGER NOT NULL DEFAULT 1)`);
  db.exec(`CREATE TABLE IF NOT EXISTS Coupon (code TEXT PRIMARY KEY, kind TEXT NOT NULL DEFAULT 'flat', value INTEGER NOT NULL DEFAULT 0, maxOff INTEGER NOT NULL DEFAULT 0, minOrder INTEGER NOT NULL DEFAULT 0, startsAt TEXT NOT NULL DEFAULT '', endsAt TEXT NOT NULL DEFAULT '', maxUses INTEGER NOT NULL DEFAULT 0, used INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1)`);
  db.exec(`CREATE TABLE IF NOT EXISTS Customer (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', cgroup TEXT NOT NULL DEFAULT 'retail', tags TEXT NOT NULL DEFAULT '', credit INTEGER NOT NULL DEFAULT 0, balance INTEGER NOT NULL DEFAULT 0, notes TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS Product (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sku TEXT NOT NULL DEFAULT '', kind TEXT NOT NULL DEFAULT 'physical', price INTEGER NOT NULL DEFAULT 0, mrp INTEGER NOT NULL DEFAULT 0, unit TEXT NOT NULL DEFAULT 'pc', perPack INTEGER NOT NULL DEFAULT 1, taxPct REAL NOT NULL DEFAULT 0, stock INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active', media TEXT NOT NULL DEFAULT '[]', seo TEXT NOT NULL DEFAULT '{}', attrs TEXT NOT NULL DEFAULT '{}', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS ShopOrder (id INTEGER PRIMARY KEY AUTOINCREMENT, customerId INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft', subtotal INTEGER NOT NULL DEFAULT 0, discount INTEGER NOT NULL DEFAULT 0, tax INTEGER NOT NULL DEFAULT 0, grand INTEGER NOT NULL DEFAULT 0, coupon TEXT NOT NULL DEFAULT '', channel TEXT NOT NULL DEFAULT 'admin', notes TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS OrderLine (id INTEGER PRIMARY KEY AUTOINCREMENT, orderId INTEGER NOT NULL, productId INTEGER NOT NULL DEFAULT 0, name TEXT NOT NULL, qty REAL NOT NULL DEFAULT 1, price INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 0)`);
  db.exec(`CREATE TABLE IF NOT EXISTS OrderEvent (id INTEGER PRIMARY KEY AUTOINCREMENT, orderId INTEGER NOT NULL, event TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', at TEXT NOT NULL DEFAULT (datetime('now')))`);
  if ((db.prepare("SELECT COUNT(*) c FROM Unit").get() as { c: number }).c === 0) {
    const ins = db.prepare("INSERT INTO Unit (name, kind, factor) VALUES (?,?,?)");
    for (const [n, k, f] of [["pc", "pc", 1], ["kg", "kg", 1000], ["g", "g", 1], ["l", "l", 1000], ["ml", "ml", 1], ["m", "m", 100], ["cm", "cm", 1], ["box", "box", 1], ["dozen", "dozen", 12], ["pack", "pack", 1]] as [string, string, number][])
      ins.run(n, k, f);
  }
  if ((db.prepare("SELECT COUNT(*) c FROM TaxRate").get() as { c: number }).c === 0) {
    const ins = db.prepare("INSERT INTO TaxRate (name, pct) VALUES (?,?)");
    for (const [n, p] of [["Exempt", 0], ["GST 5%", 5], ["GST 12%", 12], ["GST 18%", 18], ["GST 28%", 28]] as [string, number][])
      ins.run(n, p);
  }
}

function log(orderId: number, event: string, detail = ""): void {
  getDb().prepare("INSERT INTO OrderEvent (orderId, event, detail) VALUES (?,?,?)").run(orderId, event, detail.slice(0, 500));
}

// ---- units / tax / coupons ----
export function listUnits() {
  commerceTables();
  return getDb().prepare("SELECT * FROM Unit ORDER BY name").all();
}

export function listTaxes(activeOnly = false) {
  commerceTables();
  return getDb().prepare(`SELECT * FROM TaxRate ${activeOnly ? "WHERE active=1" : ""} ORDER BY pct`).all();
}

export function saveTax(input: { id?: number; name: string; pct: number; inter?: boolean; inclusive?: boolean; active?: boolean }): number {
  commerceTables();
  const db = getDb();
  if (input.id) {
    db.prepare("UPDATE TaxRate SET name=?, pct=?, inter=?, inclusive=?, active=? WHERE id=?")
      .run(input.name.slice(0, 60), input.pct, input.inter ? 1 : 0, input.inclusive === false ? 0 : 1, input.active === false ? 0 : 1, input.id);
    return input.id;
  }
  const r = db.prepare("INSERT INTO TaxRate (name, pct, inter, inclusive) VALUES (?,?,?,?)")
    .run(input.name.slice(0, 60), input.pct, input.inter ? 1 : 0, input.inclusive === false ? 0 : 1);
  return Number(r.lastInsertRowid);
}

export function listCoupons() {
  commerceTables();
  return getDb().prepare("SELECT * FROM Coupon ORDER BY code").all();
}

export function saveCoupon(input: { code: string; kind: string; value: number; maxOff?: number; minOrder?: number; startsAt?: string; endsAt?: string; maxUses?: number; active?: boolean }): void {
  commerceTables();
  getDb().prepare(`INSERT INTO Coupon (code, kind, value, maxOff, minOrder, startsAt, endsAt, maxUses, active) VALUES (?,?,?,?,?,?,?,?,?)
    ON CONFLICT(code) DO UPDATE SET kind=excluded.kind, value=excluded.value, maxOff=excluded.maxOff, minOrder=excluded.minOrder, startsAt=excluded.startsAt, endsAt=excluded.endsAt, maxUses=excluded.maxUses, active=excluded.active`)
    .run(input.code.trim().toUpperCase().slice(0, 24), input.kind === "pct" ? "pct" : "flat", Math.max(0, Math.round(input.value)),
      Math.max(0, Math.round(input.maxOff ?? 0)), Math.max(0, Math.round(input.minOrder ?? 0)),
      (input.startsAt ?? "").slice(0, 10), (input.endsAt ?? "").slice(0, 10),
      Math.max(0, Math.round(input.maxUses ?? 0)), input.active === false ? 0 : 1);
}

export function getCoupon(code: string): (CouponDef & { active: boolean }) | null {
  commerceTables();
  const r = getDb().prepare("SELECT * FROM Coupon WHERE code=?").get(code.trim().toUpperCase()) as
    { code: string; kind: string; value: number; maxOff: number; minOrder: number; startsAt: string; endsAt: string; maxUses: number; used: number; active: number } | undefined;
  if (!r || !r.active) return null;
  return {
    code: r.code, kind: r.kind as "flat" | "pct", value: r.value,
    maxOff: r.maxOff || undefined, minOrder: r.minOrder || undefined,
    startsAt: r.startsAt || undefined, endsAt: r.endsAt || undefined,
    maxUses: r.maxUses || undefined, used: r.used, active: true,
  };
}

// ---- customers ----
export function listCustomers(q = "", limit = 50) {
  commerceTables();
  const like = `%${q.slice(0, 60)}%`;
  return getDb().prepare(q
    ? "SELECT * FROM Customer WHERE name LIKE ? OR phone LIKE ? ORDER BY id DESC LIMIT ?"
    : "SELECT * FROM Customer ORDER BY id DESC LIMIT ?")
    .all(...(q ? [like, like, limit] : [limit]));
}

export function saveCustomer(input: { id?: number; name: string; phone?: string; email?: string; cgroup?: string; tags?: string; credit?: number; notes?: string }): number {
  commerceTables();
  const db = getDb();
  if (input.id) {
    db.prepare("UPDATE Customer SET name=?, phone=?, email=?, cgroup=?, tags=?, credit=?, notes=? WHERE id=?")
      .run(input.name.slice(0, 120), (input.phone ?? "").slice(0, 20), (input.email ?? "").slice(0, 120),
        (input.cgroup ?? "retail").slice(0, 30), (input.tags ?? "").slice(0, 200),
        Math.max(0, Math.round(input.credit ?? 0)), (input.notes ?? "").slice(0, 1000), input.id);
    return input.id;
  }
  const r = db.prepare("INSERT INTO Customer (name, phone, email, cgroup, tags, credit, notes) VALUES (?,?,?,?,?,?,?)")
    .run(input.name.slice(0, 120), (input.phone ?? "").slice(0, 20), (input.email ?? "").slice(0, 120),
      (input.cgroup ?? "retail").slice(0, 30), (input.tags ?? "").slice(0, 200),
      Math.max(0, Math.round(input.credit ?? 0)), (input.notes ?? "").slice(0, 1000));
  return Number(r.lastInsertRowid);
}

// ---- products ----
export function listProducts(opts: { q?: string; status?: string; limit?: number } = {}) {
  commerceTables();
  const conds: string[] = [];
  const args: (string | number)[] = [];
  if (opts.q) { conds.push("(name LIKE ? OR sku LIKE ?)"); args.push(`%${opts.q.slice(0, 60)}%`, `%${opts.q.slice(0, 60)}%`); }
  if (opts.status) { conds.push("status=?"); args.push(opts.status); }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  return getDb().prepare(`SELECT * FROM Product ${where} ORDER BY id DESC LIMIT ?`).all(...args, Math.min(100, opts.limit ?? 50));
}

export function saveProduct(input: {
  id?: number; name: string; sku?: string; kind?: string; price: number; mrp?: number;
  unit?: string; perPack?: number; taxPct?: number; stock?: number; status?: string;
  media?: string[]; seo?: Record<string, string>; attrs?: Record<string, string>;
}): number {
  commerceTables();
  const db = getDb();
  const media = JSON.stringify((input.media ?? []).slice(0, 8)).slice(0, 2000);
  const seo = JSON.stringify(input.seo ?? {}).slice(0, 1000);
  const attrs = JSON.stringify(input.attrs ?? {}).slice(0, 2000);
  if (input.id) {
    db.prepare(`UPDATE Product SET name=?, sku=?, kind=?, price=?, mrp=?, unit=?, perPack=?, taxPct=?, stock=?, status=?, media=?, seo=?, attrs=? WHERE id=?`)
      .run(input.name.slice(0, 150), (input.sku ?? "").slice(0, 40), (input.kind ?? "physical").slice(0, 20),
        Math.max(0, Math.round(input.price)), Math.max(0, Math.round(input.mrp ?? 0)),
        (input.unit ?? "pc").slice(0, 10), Math.max(1, Math.round(input.perPack ?? 1)),
        Math.max(0, input.taxPct ?? 0), Math.max(0, Math.round(input.stock ?? 0)),
        (input.status ?? "active").slice(0, 20), media, seo, attrs, input.id);
    return input.id;
  }
  const r = db.prepare(`INSERT INTO Product (name, sku, kind, price, mrp, unit, perPack, taxPct, stock, status, media, seo, attrs) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(input.name.slice(0, 150), (input.sku ?? "").slice(0, 40), (input.kind ?? "physical").slice(0, 20),
      Math.max(0, Math.round(input.price)), Math.max(0, Math.round(input.mrp ?? 0)),
      (input.unit ?? "pc").slice(0, 10), Math.max(1, Math.round(input.perPack ?? 1)),
      Math.max(0, input.taxPct ?? 0), Math.max(0, Math.round(input.stock ?? 0)),
      (input.status ?? "active").slice(0, 20), media, seo, attrs);
  return Number(r.lastInsertRowid);
}

// ---- quote + orders ----
export function quote(input: { lines: { productId: number; qty: number }[]; coupon?: string; inter?: boolean }): Quote {
  commerceTables();
  const db = getDb();
  const lines = input.lines.slice(0, 50).map((l) => {
    const p = db.prepare("SELECT id, price, taxPct FROM Product WHERE id=? AND status='active'").get(l.productId) as
      { id: number; price: number; taxPct: number } | undefined;
    if (!p) throw new Error(`product ${l.productId} unavailable`);
    return { productId: p.id, qty: Math.max(0.001, l.qty), price: p.price, taxPct: p.taxPct };
  });
  const coupon = input.coupon ? getCoupon(input.coupon) ?? undefined : undefined;
  return quoteCart(lines, { inter: !!input.inter, inclusive: true, coupon });
}

export function createOrder(input: {
  customerId?: number; lines: { productId: number; qty: number }[]; coupon?: string;
  inter?: boolean; channel?: string; notes?: string;
}): number {
  commerceTables();
  const db = getDb();
  const q = quote(input);
  if (!q.lines.length) throw new Error("empty cart");
  const orderId = Number(db.prepare(`INSERT INTO ShopOrder (customerId, status, subtotal, discount, tax, grand, coupon, channel, notes)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(
    input.customerId ?? 0, "draft", q.subtotal, q.discount, q.taxTotal, q.grand,
    q.coupon ?? "", (input.channel ?? "admin").slice(0, 20), (input.notes ?? "").slice(0, 500)).lastInsertRowid);
  const lineIns = db.prepare("INSERT INTO OrderLine (orderId, productId, name, qty, price, total) VALUES (?,?,?,?,?,?)");
  for (const l of q.lines) {
    const p = db.prepare("SELECT name, stock, kind FROM Product WHERE id=?").get(l.productId) as
      { name: string; stock: number; kind: string };
    if (p.kind === "physical" && p.stock < l.qty) throw new Error(`${p.name}: only ${p.stock} in stock`);
    lineIns.run(orderId, l.productId, p.name.slice(0, 150), l.qty, l.price, l.price * l.qty);
  }
  if (q.coupon) db.prepare("UPDATE Coupon SET used = used + 1 WHERE code=?").run(q.coupon);
  log(orderId, "created", `grand ₹${(q.grand / 100).toFixed(0)} · ${q.lines.length} lines`);
  return orderId;
}

export function getOrder(id: number) {
  commerceTables();
  const db = getDb();
  const order = db.prepare("SELECT * FROM ShopOrder WHERE id=?").get(id);
  if (!order) return null;
  return {
    order,
    lines: db.prepare("SELECT * FROM OrderLine WHERE orderId=?").all(id),
    events: db.prepare("SELECT * FROM OrderEvent WHERE orderId=? ORDER BY id").all(id),
  };
}

export function listOrders(status = "", limit = 50) {
  commerceTables();
  return getDb().prepare(status
    ? "SELECT * FROM ShopOrder WHERE status=? ORDER BY id DESC LIMIT ?"
    : "SELECT * FROM ShopOrder ORDER BY id DESC LIMIT ?").all(...(status ? [status, limit] : [limit]));
}

export async function setOrderStatus(id: number, to: string): Promise<void> {
  commerceTables();
  const db = getDb();
  const o = db.prepare("SELECT status FROM ShopOrder WHERE id=?").get(id) as { status: string } | undefined;
  if (!o) throw new Error("no order");
  if (!orderCan(o.status, to)) throw new Error(`${o.status} → ${to} not allowed`);
  // Atomic: stock moves + earn + status flip commit together — a failed
  // confirm can never leave a phantom "confirmed" order behind.
  const from = o.status;
  db.exec("BEGIN");
  try {
    if (to === "confirmed") {
      // Reserve stock at confirm through the ledger (086); physical decrement,
      // Main warehouse mirror keeps Product.stock in sync.
      const { issueStock } = await import("./inventory");
      for (const l of db.prepare("SELECT productId, qty FROM OrderLine WHERE orderId=?").all(id) as { productId: number; qty: number }[]) {
        const p = db.prepare("SELECT kind FROM Product WHERE id=?").get(l.productId) as { kind: string } | undefined;
        if (p?.kind === "physical") issueStock(l.productId, l.qty, `order#${id}`);
      }
      const { earnForOrder } = await import("./crm");
      earnForOrder(id);
    }
    if (to === "cancelled" || to === "returned") {
      // Give back what confirm took: restock physical lines, revoke earned
      // points, release the coupon use. Draft cancels only free the coupon.
      const lines = db.prepare(`SELECT l.productId, l.qty, p.kind FROM OrderLine l
        LEFT JOIN Product p ON p.id=l.productId WHERE l.orderId=?`).all(id) as
        { productId: number; qty: number; kind: string }[];
      if (from === "confirmed" || to === "returned") {
        const { receiveStock } = await import("./inventory");
        const skipped: number[] = [];
        for (const l of lines) {
          if (l.kind === "physical") {
            try { receiveStock(l.productId, l.qty, 1, 0, `order#${id}-${to}`); }
            catch { skipped.push(l.productId); } // cancel must never fail; flag it
          }
        }
        const { revokeForOrder } = await import("./crm");
        revokeForOrder(id);
        if (skipped.length) log(id, `restock-skipped`, skipped.join(","));
      }
      const ord = db.prepare("SELECT coupon FROM ShopOrder WHERE id=?").get(id) as { coupon: string } | undefined;
      if (ord?.coupon) db.prepare("UPDATE Coupon SET used = MAX(0, used - 1) WHERE code=?").run(ord.coupon);
    }
    db.prepare("UPDATE ShopOrder SET status=? WHERE id=?").run(to, id);
    log(id, `status:${to}`);
    db.exec("COMMIT");
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch { /* already out */ }
    throw e;
  }
}
