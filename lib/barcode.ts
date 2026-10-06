// Barcode repository: normalized UNIQUE codes linked to products/variants,
// internal sequence generation, duplicate-guarded assignment, indexed lookup.
import { getDb } from "./store";
import { eanCheck, normalizeBarcode, validateBarcode, type BarcodeType } from "./barcode-core";
import { productByCode } from "./commerce";

export function barcodeTables(): void {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS Barcode (
    id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL, normalized TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'UNKNOWN', productId INTEGER NOT NULL DEFAULT 0, variantId INTEGER NOT NULL DEFAULT 0,
    isPrimary INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, checkOk INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS BarcodeSeq (ns TEXT PRIMARY KEY, prefix TEXT NOT NULL DEFAULT '200', next INTEGER NOT NULL DEFAULT 1)`);
  db.exec(`CREATE TABLE IF NOT EXISTS ProductSerial (id INTEGER PRIMARY KEY AUTOINCREMENT, productId INTEGER NOT NULL, variantId INTEGER NOT NULL DEFAULT 0, serial TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'IN_STOCK', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_barcode_product ON Barcode(productId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_barcode_variant ON Barcode(variantId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_serial_product ON ProductSerial(productId)`);
}

// Internal sequence: PREFIX + zero-padded counter + EAN check (labeled INTERNAL).
export function nextInternalCode(ns = "store"): { code: string; type: "INTERNAL" } {
  barcodeTables();
  const db = getDb();
  const row = db.prepare("SELECT prefix, next FROM BarcodeSeq WHERE ns=?").get(ns) as
    { prefix: string; next: number } | undefined;
  const prefix = row?.prefix ?? "200";
  let n = row?.next ?? 1;
  // Skip codes already taken (sequence must never collide after imports).
  for (let guard = 0; guard < 10000; guard++) {
    const stem = `${prefix}${String(n).padStart(12 - prefix.length, "0")}`.slice(0, 12);
    const code = stem + eanCheck(stem);
    const taken = db.prepare("SELECT id FROM Barcode WHERE normalized=?").get(code);
    if (!taken) {
      db.prepare("INSERT INTO BarcodeSeq (ns, prefix, next) VALUES (?,?,?) ON CONFLICT(ns) DO UPDATE SET next=excluded.next")
        .run(ns, prefix, n + 1);
      return { code, type: "INTERNAL" };
    }
    n++;
  }
  throw new Error("sequence exhausted");
}

export interface AssignInput { code: string; productId: number; variantId?: number; primary?: boolean }

// validate → duplicate-check → link. Throws typed errors the API maps.
export function assignBarcode(input: AssignInput): { id: number; type: BarcodeType } {
  barcodeTables();
  const db = getDb();
  const v = validateBarcode(input.code);
  if (!v.valid) throw new Error(v.errors[0]?.code ?? "INVALID_BARCODE");
  const dup = db.prepare("SELECT productId, variantId FROM Barcode WHERE normalized=? AND active=1").get(v.normalized) as
    { productId: number; variantId: number } | undefined;
  if (dup && (dup.productId !== input.productId || (dup.variantId || 0) !== (input.variantId ?? 0))) {
    throw new Error("DUPLICATE_BARCODE");
  }
  if (dup) {
    return { id: (db.prepare("SELECT id FROM Barcode WHERE normalized=?").get(v.normalized) as { id: number }).id, type: v.type };
  }
  const p = db.prepare("SELECT id FROM Product WHERE id=?").get(input.productId);
  if (!p) throw new Error("PRODUCT_NOT_FOUND");
  if (input.variantId) {
    const vv = db.prepare("SELECT id FROM ProductVariant WHERE id=? AND productId=?").get(input.variantId, input.productId);
    if (!vv) throw new Error("PRODUCT_NOT_FOUND");
  }
  if (input.primary) db.prepare("UPDATE Barcode SET isPrimary=0 WHERE productId=? AND variantId=?").run(input.productId, input.variantId ?? 0);
  const id = Number(db.prepare(`INSERT INTO Barcode (code, normalized, type, productId, variantId, isPrimary, checkOk)
    VALUES (?,?,?,?,?,?,?)`).run(v.normalized, v.normalized, v.type, input.productId, input.variantId ?? 0,
    input.primary ? 1 : 0, v.checksumValid ? 1 : 0).lastInsertRowid);
  return { id, type: v.type };
}

// Backfill: adopt legacy single-code columns into the table (once, idempotent).
export function backfillBarcodes(): number {
  barcodeTables();
  const db = getDb();
  let n = 0;
  for (const p of db.prepare("SELECT id, barcode, barcodeType FROM Product WHERE barcode!=''").all() as
    { id: number; barcode: string; barcodeType: string }[]) {
    try {
      assignBarcode({ code: p.barcode, productId: p.id, primary: true });
      n++;
    } catch { /* duplicate/invalid legacy codes stay on the row */ }
  }
  return n;
}

// Quick-create: zod'd upstream → normalize → type → validate → dup → SKU →
// product + barcode + inventory + OPENING move, all in ONE transaction.
export async function quickCreate(input: {
  barcode: string; name: string; kind?: string; price: number; cost?: number;
  stock?: number; unit?: string; category?: string;
}): Promise<{ id: number; barcode: string; type: string }> {
  barcodeTables();
  const v = validateBarcode(input.barcode);
  if (!v.valid) throw new Error(v.errors[0]?.code ?? "INVALID_BARCODE");
  const { saveProduct, listProducts } = await import("./commerce");
  const { receiveStock } = await import("./inventory");
  const db = getDb();
  const kind = ["physical", "service", "digital"].includes(input.kind ?? "") ? input.kind! : "physical";
  db.exec("BEGIN");
  try {
    const id = saveProduct({
      name: input.name.slice(0, 150), price: Math.max(0, Math.round(input.price)),
      mrp: Math.max(0, Math.round(input.price)), kind,
      unit: (input.unit ?? "pc").slice(0, 10), category: (input.category ?? "").slice(0, 60),
      barcode: v.normalized, barcodeType: v.type === "INTERNAL" ? "custom" : undefined,
      stock: 0,
    });
    db.prepare("UPDATE Product SET sku=? WHERE id=? AND (sku='' OR sku IS NULL)").run(`SKU-${id}`, id);
    assignBarcode({ code: v.normalized, productId: id, primary: true });
    if (kind === "physical" && (input.stock ?? 0) > 0) {
      receiveStock(id, input.stock ?? 0, 1, Math.max(0, Math.round(input.cost ?? 0)), "opening");
    }
    db.exec("COMMIT");
    return { id, barcode: v.normalized, type: v.type };
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch { /* already out */ }
    throw e;
  }
}

// POS-critical lookup: ONE indexed query → product + variant + level.
export function lookupBarcode(code: string): {
  productId: number; variantId: number; name: string; price: number; stock: number; type: string;
} | null {
  barcodeTables();
  const db = getDb();
  const norm = normalizeBarcode(code);
  if (!norm) return null;
  const b = db.prepare(`SELECT b.productId, b.variantId, b.type,
      COALESCE(v.name, p.name) name,
      CASE WHEN v.price > 0 THEN v.price ELSE p.price END price,
      COALESCE(s.qty, p.stock, 0) stock
    FROM Barcode b
    JOIN Product p ON p.id=b.productId AND p.status='active'
    LEFT JOIN ProductVariant v ON v.id=b.variantId
    LEFT JOIN StockLevel s ON s.productId=b.productId AND s.warehouseId=1
    WHERE b.normalized=? AND b.active=1 LIMIT 1`).get(norm) as
    { productId: number; variantId: number; name: string; price: number; stock: number; type: string } | undefined;
  if (b) return b;
  // Legacy fallback: old single-code columns + SKU.
  return productByCode(norm);
}

// ---- serials ----
export function addSerials(productId: number, variantId: number, serials: string[]): { ok: number; errors: string[] } {
  barcodeTables();
  const db = getDb();
  let ok = 0;
  const errors: string[] = [];
  for (const raw of serials.slice(0, 500)) {
    const s = normalizeBarcode(raw).slice(0, 60);
    if (!s) continue;
    try {
      db.prepare("INSERT INTO ProductSerial (productId, variantId, serial) VALUES (?,?,?)").run(productId, variantId, s);
      ok++;
    } catch {
      errors.push(s);
    }
  }
  return { ok, errors: errors.slice(0, 20) };
}

export function markSerial(serial: string, to: "SOLD" | "RETURNED" | "DAMAGED"): boolean {
  barcodeTables();
  const db = getDb();
  const map = { SOLD: "SOLD", RETURNED: "IN_STOCK", DAMAGED: "DAMAGED" } as const;
  const r = db.prepare("UPDATE ProductSerial SET status=? WHERE serial=?").run(map[to], normalizeBarcode(serial).slice(0, 60));
  return r.changes > 0;
}

export function serialsOf(productId: number, status = "") {
  barcodeTables();
  return getDb().prepare(status
    ? "SELECT * FROM ProductSerial WHERE productId=? AND status=? ORDER BY id DESC LIMIT 200"
    : "SELECT * FROM ProductSerial WHERE productId=? ORDER BY id DESC LIMIT 200").all(...(status ? [productId, status] : [productId]));
}
