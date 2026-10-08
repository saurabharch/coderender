// Scale platform: channels, franchise + royalty, RBAC enforcement, audit log,
// CSV import/export. Reads every domain — writes only its own tables.
import { getDb } from "./store";
import { buildCsv, hasPerm, parseCsv, rolePerms, royaltyDue, type Perm } from "./scale-core";

export function scaleTables(): void {
  try {
    getDb().exec(`CREATE TABLE IF NOT EXISTS ImportBatch (id INTEGER PRIMARY KEY AUTOINCREMENT, what TEXT NOT NULL, total INTEGER NOT NULL DEFAULT 0, ok INTEGER NOT NULL DEFAULT 0, actor TEXT NOT NULL DEFAULT '', rolledBack INTEGER NOT NULL DEFAULT 0, at TEXT NOT NULL DEFAULT (datetime('now')))`);
    getDb().exec(`CREATE TABLE IF NOT EXISTS ImportRow (batchId INTEGER NOT NULL, refId INTEGER NOT NULL, PRIMARY KEY (batchId, refId))`);
  } catch { /* tables exist */ }
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS Channel (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'marketplace', active INTEGER NOT NULL DEFAULT 1)`);
  db.exec(`CREATE TABLE IF NOT EXISTS Franchisee (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, territory TEXT NOT NULL DEFAULT '', branchId INTEGER NOT NULL DEFAULT 0, royaltyPct REAL NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, joinedAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS RoyaltyLog (id INTEGER PRIMARY KEY AUTOINCREMENT, franchiseeId INTEGER NOT NULL, period TEXT NOT NULL DEFAULT '', revenue INTEGER NOT NULL DEFAULT 0, due INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'due', at TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS AuditLog (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL DEFAULT '', action TEXT NOT NULL, ref TEXT NOT NULL DEFAULT '', detail TEXT NOT NULL DEFAULT '', at TEXT NOT NULL DEFAULT (datetime('now')))`);
}

export function audit(actor: string, action: string, ref = "", detail = ""): void {
  scaleTables();
  getDb().prepare("INSERT INTO AuditLog (actor, action, ref, detail) VALUES (?,?,?,?)")
    .run(actor.slice(0, 120), action.slice(0, 80), ref.slice(0, 120), detail.slice(0, 500));
}

export function recentAudit(limit = 50) {
  scaleTables();
  return getDb().prepare("SELECT * FROM AuditLog ORDER BY id DESC LIMIT ?").all(Math.min(100, limit));
}

// RBAC gate for scale writes: owner always; others need the perm.
export function roleGate(role: string, perm: Perm): string | null {
  if (hasPerm(role, perm)) return null;
  return `role ${role || "none"} lacks ${perm}`;
}

export function roleMatrix(): { role: string; perms: Perm[] }[] {
  return ["owner", "manager", "sales", "cashier", "inventory", "accountant", "hr", "marketing", "author", "staff"]
    .map((role) => ({ role, perms: rolePerms(role) }));
}

// ---- channels ----
export function listChannels() {
  scaleTables();
  return getDb().prepare("SELECT * FROM Channel ORDER BY id").all();
}

export function saveChannel(input: { id?: number; name: string; kind?: string; active?: boolean }, actor = ""): number {
  scaleTables();
  const db = getDb();
  const kind = ["own", "marketplace", "social", "pos", "whatsapp"].includes(input.kind ?? "") ? input.kind! : "marketplace";
  let id = input.id ?? 0;
  if (id) {
    db.prepare("UPDATE Channel SET name=?, kind=?, active=? WHERE id=?")
      .run(input.name.slice(0, 80), kind, input.active === false ? 0 : 1, id);
  } else {
    id = Number(db.prepare("INSERT INTO Channel (name, kind) VALUES (?,?)").run(input.name.slice(0, 80), kind).lastInsertRowid);
  }
  audit(actor, "channel.save", String(id), input.name.slice(0, 80));
  return id;
}

// Centralize a marketplace order as a ShopOrder tagged with the channel.
export async function ingestChannelOrder(channelId: number, extRef: string, lines: { productId: number; qty: number }[], customerId = 0): Promise<number> {
  scaleTables();
  const ch = getDb().prepare("SELECT name, active FROM Channel WHERE id=?").get(channelId) as
    { name: string; active: number } | undefined;
  if (!ch || !ch.active) throw new Error("unknown channel");
  const { createOrder } = await import("./commerce");
  return await createOrder({ customerId, lines, channel: `market:${ch.name}`.slice(0, 20), notes: `ext ${extRef.slice(0, 60)}` });
}

// ---- franchise ----
export function listFranchisees() {
  scaleTables();
  return getDb().prepare("SELECT * FROM Franchisee ORDER BY id").all();
}

export function saveFranchisee(input: { id?: number; name: string; territory?: string; branchId?: number; royaltyPct?: number; active?: boolean }, actor = ""): number {
  scaleTables();
  const db = getDb();
  if (input.id) {
    db.prepare("UPDATE Franchisee SET name=?, territory=?, branchId=?, royaltyPct=?, active=? WHERE id=?")
      .run(input.name.slice(0, 120), (input.territory ?? "").slice(0, 120), input.branchId ?? 0,
        Math.max(0, Math.min(100, input.royaltyPct ?? 0)), input.active === false ? 0 : 1, input.id);
    audit(actor, "franchise.save", String(input.id), input.name.slice(0, 80));
    return input.id;
  }
  const id = Number(db.prepare("INSERT INTO Franchisee (name, territory, branchId, royaltyPct) VALUES (?,?,?,?)")
    .run(input.name.slice(0, 120), (input.territory ?? "").slice(0, 120), input.branchId ?? 0,
      Math.max(0, Math.min(100, input.royaltyPct ?? 0))).lastInsertRowid);
  audit(actor, "franchise.create", String(id), input.name.slice(0, 80));
  return id;
}

// Royalty for a period: pct × invoiced (paid bills) revenue of the branch.
export function assessRoyalty(franchiseeId: number, period: string, actor = ""): { revenue: number; due: number } {
  scaleTables();
  if (!/^\d{4}-\d{2}$/.test(period)) throw new Error("period like YYYY-MM");
  const db = getDb();
  const f = db.prepare("SELECT branchId, royaltyPct FROM Franchisee WHERE id=? AND active=1").get(franchiseeId) as
    { branchId: number; royaltyPct: number } | undefined;
  if (!f) throw new Error("unknown franchisee");
  const rev = f.branchId
    ? (db.prepare(`SELECT COALESCE(SUM(o.grand),0) s FROM ShopOrder o WHERE o.branchId=? AND o.status!='cancelled'
        AND strftime('%Y-%m', o.createdAt)=?`).get(f.branchId, period) as { s: number }).s
    : 0;
  const due = royaltyDue(rev, f.royaltyPct);
  db.prepare("INSERT INTO RoyaltyLog (franchiseeId, period, revenue, due) VALUES (?,?,?,?)").run(franchiseeId, period, rev, due);
  audit(actor, "royalty.assess", String(franchiseeId), `${period}: ₹${(due / 100).toFixed(0)} on ₹${(rev / 100).toFixed(0)}`);
  return { revenue: rev, due };
}

export function listRoyalties() {
  scaleTables();
  return getDb().prepare(`SELECT r.*, f.name FROM RoyaltyLog r LEFT JOIN Franchisee f ON f.id=r.franchiseeId ORDER BY r.id DESC LIMIT 50`).all();
}

// ---- CSV io ----
export function exportCsv(what: "products" | "customers" | "stock"): string {
  scaleTables();
  const db = getDb();
  if (what === "customers") {
    const rows = db.prepare("SELECT id, name, phone, email, cgroup, tags, stage FROM Customer ORDER BY id").all() as Record<string, unknown>[];
    return buildCsv(["id", "name", "phone", "email", "cgroup", "tags", "stage"], rows);
  }
  if (what === "stock") {
    const rows = db.prepare(`SELECT p.id, p.name, p.sku, COALESCE(s.qty,0) qty, w.name warehouse FROM Product p
      LEFT JOIN StockLevel s ON s.productId=p.id LEFT JOIN Warehouse w ON w.id=s.warehouseId WHERE p.kind='physical' ORDER BY p.id`).all() as Record<string, unknown>[];
    return buildCsv(["id", "name", "sku", "qty", "warehouse"], rows);
  }
  const rows = db.prepare("SELECT id, name, sku, kind, price, mrp, unit, taxPct, stock, status, category, barcode, barcodeType FROM Product ORDER BY id").all() as Record<string, unknown>[];
  return buildCsv(["id", "name", "sku", "kind", "price", "mrp", "unit", "taxPct", "stock", "status", "category", "barcode", "barcodeType"], rows);
}

export async function importCsv(what: "products" | "customers", text: string, actor = ""): Promise<{ ok: number; errors: string[]; batchId: number }> {
  scaleTables();
  const { headers, rows } = parseCsv(text.slice(0, 500000));
  const errors: string[] = [];
  let ok = 0;
  const made: number[] = [];
  const db = getDb();
  if (what === "products") {
    if (!headers.includes("name") || !headers.includes("price")) throw new Error("need name,price columns");
    const { saveProduct } = await import("./commerce");
    const { validateBarcode } = await import("./barcode-core");
    const seenFile = new Set<string>();
    for (let i = 0; i < Math.min(rows.length, 500); i++) {
      try {
        const r = rows[i];
        if (!r.name) throw new Error("name required");
        if (r.price !== undefined && r.price !== "" && !Number.isFinite(Number(r.price))) throw new Error(`bad price ${r.price.slice(0, 20)}`);
        let barcode = "", barcodeType: string | undefined;
        if (r.barcode?.trim()) {
          const v = validateBarcode(r.barcode);
          if (!v.valid) throw new Error(v.errors[0]?.code ?? "INVALID_BARCODE");
          const key = v.normalized.toLowerCase();
          const dupDb = !!(db.prepare("SELECT id FROM Barcode WHERE normalized=?").get(v.normalized) as unknown);
          if (seenFile.has(key) || dupDb) throw new Error("DUPLICATE_BARCODE");
          seenFile.add(key);
          barcode = v.normalized;
          barcodeType = ["isbn", "imei", "ean", "upc", "custom"].includes(r.barcodeType) ? r.barcodeType : undefined;
        }
        const pid = saveProduct({
          name: r.name, sku: r.sku ?? "", price: Math.max(0, Math.round(Number(r.price) || 0)),
          mrp: Math.max(0, Math.round(Number(r.mrp) || 0)), unit: r.unit || "pc",
          taxPct: Math.max(0, Number(r.taxPct) || 0), stock: Math.max(0, Math.round(Number(r.stock) || 0)),
          status: ["active", "draft", "archived"].includes(r.status) ? r.status : "active",
          kind: ["physical", "digital", "service"].includes(r.kind) ? r.kind : "physical",
          category: r.category ?? "", barcode,
          barcodeType,
        });
        ok++;
        made.push(pid);
        if (barcode) {
          const { assignBarcode } = await import("./barcode");
          try { assignBarcode({ code: barcode, productId: pid, primary: true }); } catch { /* row kept */ }
        }
      } catch (e) {
        errors.push(`row ${i + 2}: ${e instanceof Error ? e.message : "bad row"}`);
      }
    }
  } else {
    if (!headers.includes("name")) throw new Error("need name column");
    const { saveCustomer } = await import("./commerce");
    for (let i = 0; i < Math.min(rows.length, 500); i++) {
      try {
        const r = rows[i];
        if (!r.name) throw new Error("name required");
        made.push(saveCustomer({ name: r.name, phone: r.phone ?? "", email: r.email ?? "", cgroup: r.cgroup || "retail", tags: r.tags ?? "" }));
        ok++;
      } catch (e) {
        errors.push(`row ${i + 2}: ${e instanceof Error ? e.message : "bad row"}`);
      }
    }
  }
  const batchId = Number(db.prepare("INSERT INTO ImportBatch (what, total, ok, actor) VALUES (?,?,?,?)")
    .run(what, Math.min(rows.length, 500), ok, actor.slice(0, 120)).lastInsertRowid);
  if (made.length) {
    const ins = db.prepare("INSERT OR IGNORE INTO ImportRow (batchId, refId) VALUES (?,?)");
    for (const id of made) { try { ins.run(batchId, id); } catch { /* keep */ } }
  }
  audit(actor, `import.${what}`, String(batchId), `${ok} ok, ${errors.length} errors`);
  return { ok, errors: errors.slice(0, 20), batchId };
}

export function listBatches(limit = 20) {
  scaleTables();
  return getDb().prepare("SELECT b.*, (SELECT COUNT(*) FROM ImportRow r WHERE r.batchId=b.id) refs FROM ImportBatch b ORDER BY b.id DESC LIMIT ?").all(limit);
}

// Guarded undo: removes batch rows that never touched trade (no order lines,
// no live stock, no customer orders/balance). Touched rows are reported as
// skipped, never force-deleted. Owner/manager-gated at the route.
export function rollbackImport(batchId: number, actor = ""): { removed: number; skipped: number } {
  scaleTables();
  const db = getDb();
  const batch = db.prepare("SELECT * FROM ImportBatch WHERE id=?").get(batchId) as
    { id: number; what: string; rolledBack: number } | undefined;
  if (!batch) throw new Error("no batch");
  if (batch.rolledBack) throw new Error("already rolled back");
  const refs = db.prepare("SELECT refId FROM ImportRow WHERE batchId=?").all(batchId) as { refId: number }[];
  let removed = 0, skipped = 0;
  db.exec("BEGIN");
  try {
    for (const { refId } of refs) {
      if (batch.what === "products") {
        const used = db.prepare("SELECT id FROM OrderLine WHERE productId=? LIMIT 1").get(refId);
        const stocked = db.prepare("SELECT qty FROM StockLevel WHERE productId=?").all(refId) as { qty: number }[];
        const live = stocked.some((s) => s.qty !== 0);
        if (used || live) { skipped++; continue; }
        db.prepare("DELETE FROM Barcode WHERE productId=?").run(refId);
        db.prepare("DELETE FROM ProductPrice WHERE productId=?").run(refId);
        db.prepare("DELETE FROM ProductVariant WHERE productId=?").run(refId);
        db.prepare("DELETE FROM StockLevel WHERE productId=?").run(refId);
        db.prepare("DELETE FROM Product WHERE id=?").run(refId);
        removed++;
      } else {
        const ordered = db.prepare("SELECT id FROM ShopOrder WHERE customerId=? LIMIT 1").get(refId);
        const bal = db.prepare("SELECT balance FROM Customer WHERE id=?").get(refId) as { balance: number } | undefined;
        if (ordered || (bal && bal.balance !== 0)) { skipped++; continue; }
        db.prepare("DELETE FROM Customer WHERE id=?").run(refId);
        removed++;
      }
    }
    db.prepare("UPDATE ImportBatch SET rolledBack=1 WHERE id=?").run(batchId);
    db.exec("COMMIT");
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch { /* already out */ }
    throw e;
  }
  audit(actor, `import.rollback`, String(batchId), `${removed} removed, ${skipped} skipped`);
  return { removed, skipped };
}

// Dry-run: validate every row (incl. barcode check digits + duplicates)
// without writing anything. Returns valid/invalid/duplicate tallies.
export async function previewImport(what: "products" | "customers", text: string): Promise<{
  total: number; valid: number; invalid: number; duplicates: number;
  problems: { row: number; field: string; value: string; code: string; message: string }[];
}> {
  scaleTables();
  const { headers, rows } = parseCsv(text.slice(0, 500000));
  const problems: { row: number; field: string; value: string; code: string; message: string }[] = [];
  const seen = new Set<string>();
  let valid = 0, duplicates = 0;
  const { validateBarcode } = await import("./barcode-core");
  const db = getDb();
  const limited = rows.slice(0, 500);
  for (let i = 0; i < limited.length; i++) {
    const r = limited[i];
    const row = i + 2;
    const bad = (field: string, value: string, code: string, message: string) =>
      problems.push({ row, field, value: value.slice(0, 40), code, message });
    let rowOk = true;
    if (!r.name?.trim()) { bad("name", r.name ?? "", "EMPTY_NAME", "Name is required."); rowOk = false; }
    if (what === "products") {
      if (r.price !== undefined && r.price !== "" && !Number.isFinite(Number(r.price))) {
        bad("price", r.price, "INVALID_PRICE", "Price must be a number."); rowOk = false;
      }
      if (r.barcode?.trim()) {
        const v = validateBarcode(r.barcode);
        if (!v.valid) {
          bad("barcode", r.barcode, v.errors[0]?.code ?? "INVALID_BARCODE", v.errors[0]?.message ?? "Invalid barcode.");
          rowOk = false;
        } else {
          const key = v.normalized.toLowerCase();
          const inFile = seen.has(key);
          const inDb = !!(db.prepare("SELECT id FROM Barcode WHERE normalized=?").get(v.normalized) as unknown);
          if (inFile || inDb) {
            bad("barcode", r.barcode, "DUPLICATE_BARCODE", inFile ? "Duplicate inside this file." : "Already assigned to a product.");
            duplicates++;
            rowOk = false;
          } else seen.add(key);
        }
      }
    }
    if (rowOk) valid++;
  }
  return {
    total: limited.length, valid,
    invalid: limited.length - valid - duplicates, duplicates,
    problems: problems.slice(0, 30),
  };
}
