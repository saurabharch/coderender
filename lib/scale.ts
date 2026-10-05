// Scale platform: channels, franchise + royalty, RBAC enforcement, audit log,
// CSV import/export. Reads every domain — writes only its own tables.
import { getDb } from "./store";
import { buildCsv, hasPerm, parseCsv, rolePerms, royaltyDue, type Perm } from "./scale-core";

export function scaleTables(): void {
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
  return createOrder({ customerId, lines, channel: `market:${ch.name}`.slice(0, 20), notes: `ext ${extRef.slice(0, 60)}` });
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
  const rows = db.prepare("SELECT id, name, sku, kind, price, mrp, unit, taxPct, stock, status FROM Product ORDER BY id").all() as Record<string, unknown>[];
  return buildCsv(["id", "name", "sku", "kind", "price", "mrp", "unit", "taxPct", "stock", "status"], rows);
}

export async function importCsv(what: "products" | "customers", text: string, actor = ""): Promise<{ ok: number; errors: string[] }> {
  scaleTables();
  const { headers, rows } = parseCsv(text.slice(0, 500000));
  const errors: string[] = [];
  let ok = 0;
  if (what === "products") {
    if (!headers.includes("name") || !headers.includes("price")) throw new Error("need name,price columns");
    const { saveProduct } = await import("./commerce");
    for (let i = 0; i < Math.min(rows.length, 500); i++) {
      try {
        const r = rows[i];
        if (!r.name) throw new Error("name required");
        if (r.price !== undefined && r.price !== "" && !Number.isFinite(Number(r.price))) throw new Error(`bad price ${r.price.slice(0, 20)}`);
        saveProduct({
          name: r.name, sku: r.sku ?? "", price: Math.max(0, Math.round(Number(r.price) || 0)),
          mrp: Math.max(0, Math.round(Number(r.mrp) || 0)), unit: r.unit || "pc",
          taxPct: Math.max(0, Number(r.taxPct) || 0), stock: Math.max(0, Math.round(Number(r.stock) || 0)),
          status: ["active", "draft", "archived"].includes(r.status) ? r.status : "active",
          kind: ["physical", "digital", "service"].includes(r.kind) ? r.kind : "physical",
        });
        ok++;
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
        saveCustomer({ name: r.name, phone: r.phone ?? "", email: r.email ?? "", cgroup: r.cgroup || "retail", tags: r.tags ?? "" });
        ok++;
      } catch (e) {
        errors.push(`row ${i + 2}: ${e instanceof Error ? e.message : "bad row"}`);
      }
    }
  }
  audit(actor, `import.${what}`, "", `${ok} ok, ${errors.length} errors`);
  return { ok, errors: errors.slice(0, 20) };
}
