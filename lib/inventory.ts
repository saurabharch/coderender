// Inventory + procurement: warehouses, stock ledger, suppliers, PO → GRN → bill → pay.
// Product.stock mirrors the Main warehouse (id 1); order-confirm in 085 flows
// through issueStock so ledger and cache never diverge.
import { getDb } from "./store";
import { avgCost, needsReorder, poCan, type MoveKind } from "./inventory-core";

export function inventoryTables(): void {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS Warehouse (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, location TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1)`);
  db.exec(`CREATE TABLE IF NOT EXISTS StockLevel (productId INTEGER NOT NULL, warehouseId INTEGER NOT NULL DEFAULT 1, qty REAL NOT NULL DEFAULT 0, avgCost INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (productId, warehouseId))`);
  db.exec(`CREATE TABLE IF NOT EXISTS StockMove (id INTEGER PRIMARY KEY AUTOINCREMENT, productId INTEGER NOT NULL, warehouseId INTEGER NOT NULL DEFAULT 1, kind TEXT NOT NULL, qty REAL NOT NULL DEFAULT 0, ref TEXT NOT NULL DEFAULT '', cost INTEGER NOT NULL DEFAULT 0, at TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS Supplier (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', gstin TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', rating INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS PurchaseOrder (id INTEGER PRIMARY KEY AUTOINCREMENT, supplierId INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'draft', subtotal INTEGER NOT NULL DEFAULT 0, tax INTEGER NOT NULL DEFAULT 0, grand INTEGER NOT NULL DEFAULT 0, notes TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS POLine (id INTEGER PRIMARY KEY AUTOINCREMENT, poId INTEGER NOT NULL, productId INTEGER NOT NULL DEFAULT 0, name TEXT NOT NULL, qty REAL NOT NULL DEFAULT 1, cost INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 0)`);
  db.exec(`CREATE TABLE IF NOT EXISTS GRN (id INTEGER PRIMARY KEY AUTOINCREMENT, poId INTEGER NOT NULL, lines TEXT NOT NULL DEFAULT '[]', notes TEXT NOT NULL DEFAULT '', at TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS SupplierBill (id INTEGER PRIMARY KEY AUTOINCREMENT, poId INTEGER NOT NULL, supplierId INTEGER NOT NULL, amount INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'unpaid', dueAt TEXT NOT NULL DEFAULT '', paidAt TEXT NOT NULL DEFAULT '')`);
  db.exec(`CREATE TABLE IF NOT EXISTS StockAlert (productId INTEGER PRIMARY KEY, at TEXT NOT NULL DEFAULT (datetime('now')))`);
  try { db.exec("ALTER TABLE Product ADD COLUMN lowAt INTEGER NOT NULL DEFAULT 5"); } catch { /* exists */ }
  if ((db.prepare("SELECT COUNT(*) c FROM Warehouse").get() as { c: number }).c === 0) {
    db.prepare("INSERT INTO Warehouse (name, location) VALUES (?,?)").run("Main Store", "");
  }
}

function move(productId: number, warehouseId: number, kind: MoveKind, qty: number, ref: string, cost = 0): void {
  const db = getDb();
  db.prepare("INSERT INTO StockMove (productId, warehouseId, kind, qty, ref, cost) VALUES (?,?,?,?,?,?)")
    .run(productId, warehouseId, kind, qty, ref.slice(0, 120), Math.round(cost));
  const row = db.prepare("SELECT qty, avgCost FROM StockLevel WHERE productId=? AND warehouseId=?").get(productId, warehouseId) as
    { qty: number; avgCost: number } | undefined;
  const cur = row?.qty ?? 0;
  const delta = kind === "in" || kind === "release" ? qty : kind === "out" || kind === "reserve" ? -qty : kind === "adjust" ? qty : 0;
  const next = cur + delta;
  const avg = kind === "in" && qty > 0 ? avgCost(cur, row?.avgCost ?? 0, qty, cost) : (row?.avgCost ?? 0);
  db.prepare("INSERT INTO StockLevel (productId, warehouseId, qty, avgCost) VALUES (?,?,?,?) ON CONFLICT(productId, warehouseId) DO UPDATE SET qty=excluded.qty, avgCost=excluded.avgCost")
    .run(productId, warehouseId, next, Math.round(avg));
  if (warehouseId === 1) db.prepare("UPDATE Product SET stock=? WHERE id=?").run(Math.max(0, Math.round(next)), productId);
  const lowAt = (db.prepare("SELECT lowAt FROM Product WHERE id=?").get(productId) as { lowAt: number } | undefined)?.lowAt ?? -1;
  if (lowAt >= 0 && next > lowAt) {
    db.prepare("DELETE FROM StockAlert WHERE productId=?").run(productId);
  }
}

function ensureLevel(productId: number, warehouseId: number): number {
  const db = getDb();
  const r = db.prepare("SELECT qty FROM StockLevel WHERE productId=? AND warehouseId=?").get(productId, warehouseId) as
    { qty: number } | undefined;
  if (r) return r.qty;
  // Pre-ledger products (or new rows): seed from the Product.stock mirror once.
  const p = db.prepare("SELECT stock FROM Product WHERE id=?").get(productId) as { stock: number } | undefined;
  const seed = warehouseId === 1 ? Math.max(0, Math.round(p?.stock ?? 0)) : 0;
  db.prepare("INSERT INTO StockLevel (productId, warehouseId, qty, avgCost) VALUES (?,?,?,0)").run(productId, warehouseId, seed);
  return seed;
}

export function levelOf(productId: number, warehouseId = 1): number {
  inventoryTables();
  return ensureLevel(productId, warehouseId);
}

export function receiveStock(productId: number, qty: number, warehouseId = 1, cost = 0, ref = "receive"): void {
  inventoryTables();
  if (qty <= 0) throw new Error("qty must be positive");
  move(productId, warehouseId, "in", qty, ref, cost);
}

export function issueStock(productId: number, qty: number, ref: string, warehouseId = 1): void {
  inventoryTables();
  if (qty <= 0) throw new Error("qty must be positive");
  if (levelOf(productId, warehouseId) < qty) throw new Error("insufficient stock");
  move(productId, warehouseId, "out", qty, ref);
}

export function adjustStock(productId: number, delta: number, reason: string, warehouseId = 1): void {
  inventoryTables();
  move(productId, warehouseId, "adjust", delta, reason || "adjust");
}

export function transferStock(productId: number, fromWh: number, toWh: number, qty: number): void {
  inventoryTables();
  if (fromWh === toWh) throw new Error("same warehouse");
  if (qty <= 0) throw new Error("qty must be positive");
  if (levelOf(productId, fromWh) < qty) throw new Error("insufficient stock");
  move(productId, fromWh, "out", qty, `transfer→wh${toWh}`);
  move(productId, toWh, "in", qty, `transfer←wh${fromWh}`);
}

export function stockLevels(warehouseId = 0) {
  inventoryTables();
  const db = getDb();
  return db.prepare(warehouseId
    ? `SELECT p.id, p.name, p.sku, p.lowAt, COALESCE(s.qty,0) qty, w.name wh FROM Product p LEFT JOIN StockLevel s ON s.productId=p.id AND s.warehouseId=? LEFT JOIN Warehouse w ON w.id=? WHERE p.kind='physical' ORDER BY p.name`
    : `SELECT p.id, p.name, p.sku, p.lowAt, COALESCE(s.qty,0) qty, w.name wh FROM Product p LEFT JOIN StockLevel s ON s.productId=p.id AND s.warehouseId=1 LEFT JOIN Warehouse w ON w.id=1 WHERE p.kind='physical' ORDER BY p.name`)
    .all(...(warehouseId ? [warehouseId, warehouseId] : []));
}

export function stockMoves(productId = 0, limit = 50) {
  inventoryTables();
  return getDb().prepare(productId
    ? "SELECT * FROM StockMove WHERE productId=? ORDER BY id DESC LIMIT ?"
    : "SELECT * FROM StockMove ORDER BY id DESC LIMIT ?").all(...(productId ? [productId, limit] : [limit]));
}

export function lowStockList() {
  inventoryTables();
  return (getDb().prepare(`SELECT p.id, p.name, p.lowAt, COALESCE(s.qty,0) qty FROM Product p
    LEFT JOIN StockLevel s ON s.productId=p.id AND s.warehouseId=1 WHERE p.kind='physical' AND p.status='active'`).all() as
    { id: number; name: string; lowAt: number; qty: number }[])
    .filter((r) => needsReorder(r.qty, r.lowAt));
}

// Alert once per product until restocked; returns newly alerted rows.
export function stockAlertTick(): { id: number; name: string; qty: number }[] {
  inventoryTables();
  const db = getDb();
  const fresh = lowStockList().filter((r) =>
    !(db.prepare("SELECT productId FROM StockAlert WHERE productId=?").get(r.id)));
  for (const r of fresh) {
    db.prepare("INSERT INTO StockAlert (productId) VALUES (?)").run(r.id);
    db.prepare("INSERT INTO Notification (title, body, audience, kind, target) VALUES (?,?,?,?,?)")
      .run(`Low stock: ${r.name}`, `${r.qty} left (reorder at ${r.lowAt}). Receive stock or raise a PO.`, "team", "warning", "team");
  }
  return fresh;
}

// ---- warehouses / suppliers ----
export function listWarehouses() {
  inventoryTables();
  return getDb().prepare("SELECT * FROM Warehouse ORDER BY id").all();
}

export function saveWarehouse(input: { id?: number; name: string; location?: string; active?: boolean }): number {
  inventoryTables();
  const db = getDb();
  if (input.id) {
    db.prepare("UPDATE Warehouse SET name=?, location=?, active=? WHERE id=?")
      .run(input.name.slice(0, 80), (input.location ?? "").slice(0, 120), input.active === false ? 0 : 1, input.id);
    return input.id;
  }
  return Number(db.prepare("INSERT INTO Warehouse (name, location) VALUES (?,?)")
    .run(input.name.slice(0, 80), (input.location ?? "").slice(0, 120)).lastInsertRowid);
}

export function listSuppliers() {
  inventoryTables();
  return getDb().prepare("SELECT * FROM Supplier ORDER BY name").all();
}

export function saveSupplier(input: { id?: number; name: string; phone?: string; email?: string; gstin?: string; address?: string; rating?: number }): number {
  inventoryTables();
  const db = getDb();
  if (input.id) {
    db.prepare("UPDATE Supplier SET name=?, phone=?, email=?, gstin=?, address=?, rating=? WHERE id=?")
      .run(input.name.slice(0, 120), (input.phone ?? "").slice(0, 20), (input.email ?? "").slice(0, 120),
        (input.gstin ?? "").slice(0, 20), (input.address ?? "").slice(0, 300), Math.max(0, Math.min(5, input.rating ?? 0)), input.id);
    return input.id;
  }
  return Number(db.prepare("INSERT INTO Supplier (name, phone, email, gstin, address, rating) VALUES (?,?,?,?,?,?)")
    .run(input.name.slice(0, 120), (input.phone ?? "").slice(0, 20), (input.email ?? "").slice(0, 120),
      (input.gstin ?? "").slice(0, 20), (input.address ?? "").slice(0, 300), Math.max(0, Math.min(5, input.rating ?? 0))).lastInsertRowid);
}

// ---- purchase orders ----
export function createPO(input: { supplierId: number; lines: { productId: number; qty: number; cost: number }[]; notes?: string }): number {
  inventoryTables();
  const db = getDb();
  const sup = db.prepare("SELECT id FROM Supplier WHERE id=?").get(input.supplierId);
  if (!sup) throw new Error("no supplier");
  const lines = input.lines.slice(0, 50).map((l) => {
    const p = db.prepare("SELECT name FROM Product WHERE id=?").get(l.productId) as { name: string } | undefined;
    if (!p) throw new Error(`product ${l.productId} missing`);
    return { productId: l.productId, name: p.name, qty: l.qty, cost: Math.max(0, Math.round(l.cost)) };
  });
  if (!lines.length) throw new Error("empty PO");
  const subtotal = lines.reduce((s, l) => s + l.qty * l.cost, 0);
  const id = Number(db.prepare("INSERT INTO PurchaseOrder (supplierId, status, subtotal, tax, grand, notes) VALUES (?,?,?,?,?,?)")
    .run(input.supplierId, "draft", subtotal, 0, subtotal, (input.notes ?? "").slice(0, 500)).lastInsertRowid);
  const ins = db.prepare("INSERT INTO POLine (poId, productId, name, qty, cost, total) VALUES (?,?,?,?,?,?)");
  for (const l of lines) ins.run(id, l.productId, l.name.slice(0, 150), l.qty, l.cost, Math.round(l.qty * l.cost));
  return id;
}

export function getPO(id: number) {
  inventoryTables();
  const db = getDb();
  const po = db.prepare(`SELECT o.*, s.name supplier FROM PurchaseOrder o LEFT JOIN Supplier s ON s.id=o.supplierId WHERE o.id=?`).get(id);
  if (!po) return null;
  return {
    po, lines: db.prepare("SELECT * FROM POLine WHERE poId=?").all(id),
    grns: db.prepare("SELECT * FROM GRN WHERE poId=? ORDER BY id").all(id),
    bills: db.prepare("SELECT * FROM SupplierBill WHERE poId=? ORDER BY id").all(id),
  };
}

export function listPOs(status = "") {
  inventoryTables();
  return getDb().prepare(status
    ? `SELECT o.*, s.name supplier FROM PurchaseOrder o LEFT JOIN Supplier s ON s.id=o.supplierId WHERE o.status=? ORDER BY o.id DESC LIMIT 50`
    : `SELECT o.*, s.name supplier FROM PurchaseOrder o LEFT JOIN Supplier s ON s.id=o.supplierId ORDER BY o.id DESC LIMIT 50`)
    .all(...(status ? [status] : []));
}

export function setPOStatus(id: number, to: string): void {
  inventoryTables();
  const db = getDb();
  const o = db.prepare("SELECT status FROM PurchaseOrder WHERE id=?").get(id) as { status: string } | undefined;
  if (!o) throw new Error("no PO");
  if (!poCan(o.status, to)) throw new Error(`${o.status} → ${to} not allowed`);
  db.prepare("UPDATE PurchaseOrder SET status=? WHERE id=?").run(to, id);
}

// GRN: receive lines into stock (default Main warehouse).
export function receivePO(id: number, lines: { productId: number; qty: number }[], warehouseId = 1, notes = ""): number {
  inventoryTables();
  const db = getDb();
  const o = db.prepare("SELECT status, supplierId FROM PurchaseOrder WHERE id=?").get(id) as
    { status: string; supplierId: number } | undefined;
  if (!o) throw new Error("no PO");
  if (o.status !== "sent") throw new Error("PO must be sent before receiving");
  const clean = lines.filter((l) => l.qty > 0).slice(0, 50);
  if (!clean.length) throw new Error("nothing to receive");
  db.exec("BEGIN");
  try {
    for (const l of clean) {
      const line = db.prepare("SELECT cost FROM POLine WHERE poId=? AND productId=?").get(id, l.productId) as
        { cost: number } | undefined;
      receiveStock(l.productId, l.qty, warehouseId, line?.cost ?? 0, `grn:po${id}`);
    }
    const grn = Number(db.prepare("INSERT INTO GRN (poId, lines, notes) VALUES (?,?,?)")
      .run(id, JSON.stringify(clean).slice(0, 2000), notes.slice(0, 300)).lastInsertRowid);
    db.prepare("UPDATE PurchaseOrder SET status='received' WHERE id=?").run(id);
    db.exec("COMMIT");
    return grn;
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch { /* already out */ }
    throw e;
  }
}

export function billPO(id: number, amount?: number, dueAt = ""): number {
  inventoryTables();
  const db = getDb();
  const o = db.prepare("SELECT status, supplierId, grand FROM PurchaseOrder WHERE id=?").get(id) as
    { status: string; supplierId: number; grand: number } | undefined;
  if (!o) throw new Error("no PO");
  if (o.status !== "received") throw new Error("receive goods before billing");
  const bill = Number(db.prepare("INSERT INTO SupplierBill (poId, supplierId, amount, dueAt) VALUES (?,?,?,?)")
    .run(id, o.supplierId, amount ?? o.grand, dueAt.slice(0, 10)).lastInsertRowid);
  db.prepare("UPDATE PurchaseOrder SET status='billed' WHERE id=?").run(id);
  return bill;
}

export function payBill(billId: number): void {
  inventoryTables();
  const db = getDb();
  const b = db.prepare("SELECT status, poId FROM SupplierBill WHERE id=?").get(billId) as
    { status: string; poId: number } | undefined;
  if (!b) throw new Error("no bill");
  if (b.status !== "unpaid") throw new Error("bill not payable");
  db.prepare("UPDATE SupplierBill SET status='paid', paidAt=datetime('now') WHERE id=?").run(billId);
  db.prepare("UPDATE PurchaseOrder SET status='paid' WHERE id=?").run(b.poId);
}
