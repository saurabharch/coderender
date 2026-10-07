// Retail: campaigns + abandoned carts, POS drawer/sales/settlement, shipments.
// Sends through notify/providers ledgers; orders through commerce — no parallel pipes.
import { getDb } from "./store";
import { DEFAULT_COURIERS, isAbandoned, renderMessage, settleDrawer, shipCan } from "./retail-core";

export function retailTables(): void {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS Campaign (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, channel TEXT NOT NULL DEFAULT 'whatsapp', segment TEXT NOT NULL DEFAULT 'active', coupon TEXT NOT NULL DEFAULT '', message TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft', runAt TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS CampaignSend (id INTEGER PRIMARY KEY AUTOINCREMENT, campaignId INTEGER NOT NULL, customerId INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'queued', detail TEXT NOT NULL DEFAULT '', at TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS Cart (id INTEGER PRIMARY KEY AUTOINCREMENT, customerId INTEGER NOT NULL DEFAULT 0, lines TEXT NOT NULL DEFAULT '[]', recovered INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS DrawerDay (id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL UNIQUE, openedBy TEXT NOT NULL DEFAULT '', opening INTEGER NOT NULL DEFAULT 0, counted INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'open', closedAt TEXT NOT NULL DEFAULT '')`);
  db.exec(`CREATE TABLE IF NOT EXISTS Shipment (id INTEGER PRIMARY KEY AUTOINCREMENT, orderId INTEGER NOT NULL, courier TEXT NOT NULL DEFAULT '', tracking TEXT NOT NULL DEFAULT '', zone TEXT NOT NULL DEFAULT '', charge INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'created', notes TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS ShipZone (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, charge INTEGER NOT NULL DEFAULT 0, eta TEXT NOT NULL DEFAULT '')`);
  db.exec(`CREATE TABLE IF NOT EXISTS Courier (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, url TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1)`);
  if ((db.prepare("SELECT COUNT(*) c FROM ShipZone").get() as { c: number }).c === 0) {
    const ins = db.prepare("INSERT INTO ShipZone (name, charge, eta) VALUES (?,?,?)");
    ins.run("Local", 0, "same day"); ins.run("City", 4900, "1-2 days"); ins.run("National", 9900, "3-5 days");
  }
  if ((db.prepare("SELECT COUNT(*) c FROM Courier").get() as { c: number }).c === 0) {
    const ins = db.prepare("INSERT INTO Courier (name, url) VALUES (?,?)");
    for (const c of DEFAULT_COURIERS) ins.run(c.name, c.url);
  }
}

// ---- campaigns ----
export function listCampaigns() {
  retailTables();
  return getDb().prepare("SELECT * FROM Campaign ORDER BY id DESC LIMIT 50").all();
}

export function saveCampaign(input: { id?: number; name: string; channel?: string; segment?: string; coupon?: string; message?: string; runAt?: string }): number {
  retailTables();
  const db = getDb();
  const ch = ["email", "whatsapp", "push"].includes(input.channel ?? "") ? input.channel! : "whatsapp";
  if (input.id) {
    db.prepare("UPDATE Campaign SET name=?, channel=?, segment=?, coupon=?, message=?, runAt=? WHERE id=? AND status='draft'")
      .run(input.name.slice(0, 120), ch, (input.segment ?? "active").slice(0, 20), (input.coupon ?? "").slice(0, 24),
        (input.message ?? "").slice(0, 1000), (input.runAt ?? "").slice(0, 16), input.id);
    return input.id;
  }
  return Number(db.prepare("INSERT INTO Campaign (name, channel, segment, coupon, message, runAt) VALUES (?,?,?,?,?,?)")
    .run(input.name.slice(0, 120), ch, (input.segment ?? "active").slice(0, 20), (input.coupon ?? "").slice(0, 24),
      (input.message ?? "").slice(0, 1000), (input.runAt ?? "").slice(0, 16)).lastInsertRowid);
}

export function launchCampaign(id: number): void {
  retailTables();
  getDb().prepare("UPDATE Campaign SET status='running' WHERE id=? AND status='draft'").run(id);
}

// One tick: due running campaigns send to their segment (once per customer).
export async function campaignTick(): Promise<number> {
  retailTables();
  const db = getDb();
  const { segmentList } = await import("./crm");
  let sent = 0;
  for (const c of db.prepare("SELECT * FROM Campaign WHERE status='running' AND (runAt='' OR runAt <= datetime('now','localtime'))").all() as
    { id: number; channel: string; segment: string; coupon: string; message: string }[]) {
    const audience = segmentList(c.segment as never, 200);
    for (const a of audience) {
      if (db.prepare("SELECT id FROM CampaignSend WHERE campaignId=? AND customerId=?").get(c.id, a.id)) continue;
      const msg = renderMessage(c.message || "Offer for you: {{coupon}}", { name: a.name, coupon: c.coupon || "—" });
      let status = "sent", detail = "";
      try {
        const cust = db.prepare("SELECT phone, email FROM Customer WHERE id=?").get(a.id) as { phone: string; email: string };
        if (c.channel === "email") {
          if (!cust?.email) throw new Error("no email");
          const { sendMail } = await import("./mailer");
          await sendMail(cust.email, "Offer", `<p>${msg}</p>`);
          detail = cust.email;
        } else if (c.channel === "push") {
          db.prepare("INSERT INTO Notification (title, body, audience, kind, target) VALUES (?,?,?,?,?)")
            .run("Offer", msg, "all", "promo", "all");
          detail = "broadcast";
        } else {
          if (!cust?.phone) throw new Error("no phone");
          const { sendWhatsApp } = await import("./providers");
          const r = await sendWhatsApp(cust.phone, msg);
          if (!r.sent) throw new Error(r.via);
          detail = cust.phone;
        }
      } catch (e) {
        status = "failed"; detail = e instanceof Error ? e.message.slice(0, 200) : "failed";
      }
      db.prepare("INSERT INTO CampaignSend (campaignId, customerId, status, detail) VALUES (?,?,?,?)").run(c.id, a.id, status, detail);
      if (status === "sent") sent++;
    }
    const left = (db.prepare(`SELECT COUNT(*) c FROM CampaignSend WHERE campaignId=? AND status='queued'`).get(c.id) as { c: number }).c;
    if (left === 0) db.prepare("UPDATE Campaign SET status='done' WHERE id=?").run(c.id);
  }
  return sent;
}

// ---- carts ----
export function saveCart(customerId: number, lines: { productId: number; qty: number }[]): number {
  retailTables();
  return Number(getDb().prepare("INSERT INTO Cart (customerId, lines) VALUES (?,?)")
    .run(customerId, JSON.stringify(lines.slice(0, 50)).slice(0, 4000)).lastInsertRowid);
}

export function listHeldCarts(): { id: number; lines: { productId: number; qty: number }[]; createdAt: string; items: number }[] {
  retailTables();
  return (getDb().prepare("SELECT id, lines, createdAt FROM Cart WHERE recovered=0 ORDER BY id DESC LIMIT 20").all() as
    { id: number; lines: string; createdAt: string }[]).map((c) => {
    const lines = JSON.parse(c.lines || "[]") as { productId: number; qty: number }[];
    return { id: c.id, lines, createdAt: c.createdAt, items: lines.reduce((s, l) => s + l.qty, 0) };
  });
}

// Resume pulls names/prices fresh (a held cart stores ids only).
export function resumeCart(id: number): { productId: number; qty: number }[] | null {
  retailTables();
  const db = getDb();
  const c = db.prepare("SELECT lines FROM Cart WHERE id=? AND recovered=0").get(id) as { lines: string } | undefined;
  if (!c) return null;
  db.prepare("UPDATE Cart SET recovered=1 WHERE id=?").run(id);
  return JSON.parse(c.lines || "[]") as { productId: number; qty: number }[];
}

export async function cartRecoveryTick(): Promise<number> {
  retailTables();
  const db = getDb();
  let n = 0;
  for (const c of db.prepare("SELECT * FROM Cart WHERE recovered=0 AND createdAt < datetime('now','-3 hours') ORDER BY id LIMIT 50").all() as
    { id: number; customerId: number; createdAt: string }[]) {
    const last = db.prepare("SELECT MAX(createdAt) m FROM ShopOrder WHERE customerId=?").get(c.customerId) as { m: string | null };
    if (!isAbandoned(c.createdAt, last?.m ?? null)) continue;
    const cust = db.prepare("SELECT phone, name FROM Customer WHERE id=?").get(c.customerId) as { phone: string; name: string } | undefined;
    if (cust?.phone) {
      try {
        const { sendWhatsApp } = await import("./providers");
        const r = await sendWhatsApp(cust.phone, `Hi ${cust.name || "there"} — you left items in your cart. Reply to complete your order!`);
        if (r.sent) n++;
      } catch { /* next tick retries */ }
    }
    db.prepare("UPDATE Cart SET recovered=1 WHERE id=?").run(c.id);
  }
  return n;
}

// ---- POS ----
export function drawerToday() {
  retailTables();
  const day = new Date().toISOString().slice(0, 10);
  return getDb().prepare("SELECT * FROM DrawerDay WHERE day=?").get(day) as
    { id: number; day: string; openedBy: string; opening: number; counted: number; status: string } | undefined ?? null;
}

export function openDrawer(opening: number, by: string): void {
  retailTables();
  const day = new Date().toISOString().slice(0, 10);
  getDb().prepare("INSERT INTO DrawerDay (day, openedBy, opening) VALUES (?,?,?) ON CONFLICT(day) DO NOTHING")
    .run(day, by.slice(0, 120), Math.max(0, Math.round(opening)));
}

export async function posSale(input: {
  lines: { productId: number; qty: number }[]; customerId?: number; method?: string; cashIn?: number; by?: string;
  discountPaise?: number; discountPct?: number;
  payments?: { method?: string; amount?: number }[];
}): Promise<{ orderId: number; change: number }> {
  retailTables();
  const { createOrder, setOrderStatus, quote } = await import("./commerce");
  const { recordPayment } = await import("./finance");
  let manualDiscount = Math.max(0, Math.round(input.discountPaise ?? 0));
  if (!manualDiscount && (input.discountPct ?? 0) > 0) {
    const q = quote({ lines: input.lines, customerId: input.customerId, channel: "pos" });
    manualDiscount = Math.round((q.subtotal * Math.min(100, input.discountPct!)) / 100);
  }
  const METHODS = ["cash", "upi", "card"];
  // Split tender validates BEFORE anything is written: rows must sum exactly
  // to the quoted grand total (no change math in split mode).
  let split: { method: string; amount: number }[] | null = null;
  if (input.payments && input.payments.length > 0) {
    split = input.payments.map((p) => ({
      method: METHODS.includes(p.method ?? "") ? p.method! : "cash",
      amount: Math.max(0, Math.round(p.amount ?? 0)),
    })).filter((p) => p.amount > 0);
    if (split.length === 0) throw new Error("empty split");
    const q0 = quote({ lines: input.lines, customerId: input.customerId, channel: "pos", manualDiscount });
    if (split.reduce((s, p) => s + p.amount, 0) !== q0.grand) {
      throw new Error(`split must equal total ₹${(q0.grand / 100).toFixed(0)}`);
    }
  }
  const id = await createOrder({
    customerId: input.customerId, lines: input.lines, channel: "pos",
    notes: `pos by ${input.by ?? "counter"}`, ...(manualDiscount > 0 ? { manualDiscount } : {}),
  });
  await setOrderStatus(id, "confirmed");
  const got = (await import("./commerce")).getOrder(id) as { order: { grand: number } } | null;
  if (!got) throw new Error("sale lost");
  const o = got;
  if (split) {
    // Pre-validated: record each row, drawer takes the cash portion only.
    for (const p of split) await recordPayment(id, p.amount, p.method, "paid");
    const cashTotal = split.filter((p) => p.method === "cash").reduce((s, p) => s + p.amount, 0);
    if (cashTotal > 0) {
      const d = drawerToday();
      if (d && d.status === "open") {
        const { bankMove } = await import("./billing");
        bankMove(1, "in", cashTotal, `pos#${id}`, "counter sale (split cash)");
      }
    }
    return { orderId: id, change: 0 };
  }
  const method = METHODS.includes(input.method ?? "") ? input.method! : "cash";
  await recordPayment(id, o.order.grand, method, "paid");
  if (method === "cash") {
    const d = drawerToday();
    if (d && d.status === "open") {
      const { bankMove } = await import("./billing");
      bankMove(1, "in", o.order.grand, `pos#${id}`, "counter sale");
    }
  }
  return { orderId: id, change: Math.max(0, Math.round(input.cashIn ?? 0) - o.order.grand) };
}

export function settleDay(counted: number): { expected: number; diff: number } {
  retailTables();
  const db = getDb();
  const d = drawerToday();
  if (!d || d.status !== "open") throw new Error("drawer not open");
  const cashIn = (db.prepare(`SELECT COALESCE(SUM(amount),0) s FROM BankTx WHERE accountId=1 AND kind='in' AND date(at)=date('now','localtime') AND ref LIKE 'pos#%'`).get() as { s: number }).s;
  const { expected, diff } = settleDrawer(d.opening, cashIn, Math.round(counted));
  db.prepare("UPDATE DrawerDay SET counted=?, status='closed', closedAt=datetime('now') WHERE id=?").run(Math.round(counted), d.id);
  return { expected, diff };
}

// ---- shipments ----
export function listZones() {
  retailTables();
  return getDb().prepare("SELECT * FROM ShipZone ORDER BY charge").all();
}

export function saveZone(input: { id?: number; name: string; charge?: number; eta?: string }): number {
  retailTables();
  const db = getDb();
  if (input.id) {
    db.prepare("UPDATE ShipZone SET name=?, charge=?, eta=? WHERE id=?")
      .run(input.name.slice(0, 60), Math.max(0, Math.round(input.charge ?? 0)), (input.eta ?? "").slice(0, 40), input.id);
    return input.id;
  }
  return Number(db.prepare("INSERT INTO ShipZone (name, charge, eta) VALUES (?,?,?)")
    .run(input.name.slice(0, 60), Math.max(0, Math.round(input.charge ?? 0)), (input.eta ?? "").slice(0, 40)).lastInsertRowid);
}

export function listShipments(status = "") {
  retailTables();
  return getDb().prepare(status
    ? `SELECT s.*, o.grand FROM Shipment s LEFT JOIN ShopOrder o ON o.id=s.orderId WHERE s.status=? ORDER BY s.id DESC LIMIT 50`
    : `SELECT s.*, o.grand FROM Shipment s LEFT JOIN ShopOrder o ON o.id=s.orderId ORDER BY s.id DESC LIMIT 50`)
    .all(...(status ? [status] : []));
}

export function createShipment(input: { orderId: number; courier?: string; tracking?: string; zone?: string; charge?: number; notes?: string }): number {
  retailTables();
  const db = getDb();
  const o = db.prepare("SELECT id FROM ShopOrder WHERE id=?").get(input.orderId);
  if (!o) throw new Error("no order");
  return Number(db.prepare("INSERT INTO Shipment (orderId, courier, tracking, zone, charge, notes) VALUES (?,?,?,?,?,?)")
    .run(input.orderId, (input.courier ?? "").slice(0, 60), (input.tracking ?? "").slice(0, 80),
      (input.zone ?? "").slice(0, 40), Math.max(0, Math.round(input.charge ?? 0)), (input.notes ?? "").slice(0, 300)).lastInsertRowid);
}

export function setShipStatus(id: number, to: string): void {
  retailTables();
  const db = getDb();
  const s = db.prepare("SELECT status FROM Shipment WHERE id=?").get(id) as { status: string } | undefined;
  if (!s) throw new Error("no shipment");
  if (!shipCan(s.status, to)) throw new Error(`${s.status} → ${to} not allowed`);
  db.prepare("UPDATE Shipment SET status=? WHERE id=?").run(to, id);
}

// Courier directory: tracking deep-links per partner, editable in Retail.
export function listCouriers() {
  retailTables();
  return getDb().prepare("SELECT * FROM Courier WHERE active=1 ORDER BY name").all() as
    { id: number; name: string; url: string }[];
}

export function saveCourier(input: { id?: number; name: string; url?: string }): number {
  retailTables();
  const db = getDb();
  const name = input.name.trim().slice(0, 60);
  if (!name) throw new Error("name required");
  const url = (input.url ?? "").trim().slice(0, 300);
  if (input.id) {
    db.prepare("UPDATE Courier SET name=?, url=? WHERE id=?").run(name, url, input.id);
    return input.id;
  }
  return Number(db.prepare("INSERT INTO Courier (name, url) VALUES (?,?) ON CONFLICT(name) DO UPDATE SET url=excluded.url")
    .run(name, url).lastInsertRowid);
}

export function deleteCourier(id: number): void {
  retailTables();
  getDb().prepare("DELETE FROM Courier WHERE id=?").run(id);
}
