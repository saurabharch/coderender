// Commerce foundation: units, tax, coupons, customers, products, orders.
// Reuses ledger/notify/flows by event — catalog (services/packages) untouched.
// Money in paise; math lives in commerce-core.
import { getDb } from "./store";
import { couponOff, orderCan, quoteCart, resolvePrice, type CouponDef, type PriceRow, type Quote } from "./commerce-core";
import { fefoLots, openProductStock, releaseStock, reservedFor, reserveStock, setProductStock } from "./inventory";
import { eanFromId } from "./barcode-core";
import { bankMove } from "./billing";
import { ledgerPost } from "./finance";

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
  db.exec(`CREATE TABLE IF NOT EXISTS ProductVariant (id INTEGER PRIMARY KEY AUTOINCREMENT, productId INTEGER NOT NULL, name TEXT NOT NULL DEFAULT '', sku TEXT NOT NULL DEFAULT '', attrs TEXT NOT NULL DEFAULT '{}', price INTEGER NOT NULL DEFAULT 0, mrp INTEGER NOT NULL DEFAULT 0, stock INTEGER NOT NULL DEFAULT 0, barcode TEXT NOT NULL DEFAULT '', barcodeType TEXT NOT NULL DEFAULT '')`);
  db.exec(`CREATE TABLE IF NOT EXISTS Wishlist (customerId INTEGER NOT NULL, productId INTEGER NOT NULL, at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (customerId, productId))`);
  db.exec(`CREATE TABLE IF NOT EXISTS ProductView (id INTEGER PRIMARY KEY AUTOINCREMENT, fp TEXT NOT NULL DEFAULT '', customerId INTEGER NOT NULL DEFAULT 0, productId INTEGER NOT NULL, at TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS BinLoc (id INTEGER PRIMARY KEY AUTOINCREMENT, warehouseId INTEGER NOT NULL DEFAULT 1, floor TEXT NOT NULL DEFAULT '', rack TEXT NOT NULL DEFAULT '', shelf TEXT NOT NULL DEFAULT '', code TEXT NOT NULL DEFAULT '')`);
  db.exec(`CREATE TABLE IF NOT EXISTS ProductLot (id INTEGER PRIMARY KEY AUTOINCREMENT, productId INTEGER NOT NULL, lot TEXT NOT NULL DEFAULT '', mfg TEXT NOT NULL DEFAULT '', exp TEXT NOT NULL DEFAULT '', qty REAL NOT NULL DEFAULT 0, cost INTEGER NOT NULL DEFAULT 0, sell INTEGER NOT NULL DEFAULT 0, notes TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  try { db.exec("ALTER TABLE ProductLot ADD COLUMN cost INTEGER NOT NULL DEFAULT 0"); } catch { /* exists */ }
  try { db.exec("ALTER TABLE ProductLot ADD COLUMN sell INTEGER NOT NULL DEFAULT 0"); } catch { /* exists */ }
  db.exec(`CREATE TABLE IF NOT EXISTS ProductExt (productId INTEGER PRIMARY KEY, kind TEXT NOT NULL DEFAULT '', payload TEXT NOT NULL DEFAULT '{}', updatedAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  try { db.exec("ALTER TABLE Product ADD COLUMN avail TEXT NOT NULL DEFAULT 'in_stock'"); } catch { /* exists */ }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_lot_product ON ProductLot(productId)`);
  db.exec(`CREATE TABLE IF NOT EXISTS ProductChannel (productId INTEGER NOT NULL, channel TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, onlinePrice INTEGER NOT NULL DEFAULT 0, minQty REAL NOT NULL DEFAULT 0, maxQty REAL NOT NULL DEFAULT 0, PRIMARY KEY (productId, channel))`);
  db.exec(`CREATE TABLE IF NOT EXISTS ProductPrice (id INTEGER PRIMARY KEY AUTOINCREMENT, productId INTEGER NOT NULL, variantId INTEGER NOT NULL DEFAULT 0, priceType TEXT NOT NULL DEFAULT 'retail', amount INTEGER NOT NULL DEFAULT 0, minQty REAL NOT NULL DEFAULT 0, startsAt TEXT NOT NULL DEFAULT '', endsAt TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_price_product ON ProductPrice(productId, priceType)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_product_barcode ON Product(barcode)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_product_sku ON Product(sku)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_product_name ON Product(name)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_move_product ON StockMove(productId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_level_product ON StockLevel(productId)`);
  db.exec(`CREATE TABLE IF NOT EXISTS LotAlert (lotId INTEGER PRIMARY KEY, at TEXT NOT NULL DEFAULT (datetime('now')))`);
  try { db.exec("ALTER TABLE Product ADD COLUMN behavior TEXT NOT NULL DEFAULT 'stocked'"); } catch { /* exists */ }
  for (const [t, c] of [
    ["Product", "category TEXT NOT NULL DEFAULT ''"], ["Product", "subcategory TEXT NOT NULL DEFAULT ''"],
    ["Product", "shortDesc TEXT NOT NULL DEFAULT ''"], ["Product", "description TEXT NOT NULL DEFAULT ''"],
    ["Product", "specs TEXT NOT NULL DEFAULT '{}'"], ["Product", "images TEXT NOT NULL DEFAULT '[]'"],
    ["Product", "videos TEXT NOT NULL DEFAULT '[]'"], ["Product", "barcode TEXT NOT NULL DEFAULT ''"],
    ["Product", "barcodeType TEXT NOT NULL DEFAULT ''"], ["Product", "bin TEXT NOT NULL DEFAULT ''"],
    ["Product", "ratingAvg REAL NOT NULL DEFAULT 0"], ["Product", "ratingCount INTEGER NOT NULL DEFAULT 0"],
  ] as [string, string][]) {
    try { db.exec(`ALTER TABLE ${t} ADD COLUMN ${c}`); } catch { /* exists */ }
  }
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
  if (opts.q) { conds.push("(name LIKE ? OR sku LIKE ? OR barcode LIKE ?)"); args.push(`%${opts.q.slice(0, 60)}%`, `%${opts.q.slice(0, 60)}%`, `%${opts.q.slice(0, 60)}%`); }
  if (opts.status) { conds.push("status=?"); args.push(opts.status); }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  return getDb().prepare(`SELECT p.*, (SELECT COUNT(*) FROM ProductVariant v WHERE v.productId=p.id) vcount FROM Product p ${where} ORDER BY p.id DESC LIMIT ?`).all(...args, Math.min(100, opts.limit ?? 50));
}

export const BARCODES = ["", "isbn", "imei", "ean", "upc", "custom"];

export function saveProduct(input: {
  id?: number; name: string; sku?: string; kind?: string; price?: number; mrp?: number;
  unit?: string; perPack?: number; taxPct?: number; stock?: number; status?: string;
  media?: string[]; seo?: Record<string, string>; attrs?: Record<string, string>;
  category?: string; subcategory?: string; shortDesc?: string; description?: string;
  specs?: Record<string, string>; images?: string[]; videos?: string[];
  barcode?: string; barcodeType?: string; bin?: string; behavior?: string;
}): number {
  commerceTables();
  const db = getDb();
  const bt = BARCODES.includes(input.barcodeType ?? "") ? (input.barcodeType ?? "") : "";
  const prev = input.id
    ? (db.prepare("SELECT * FROM Product WHERE id=?").get(input.id) as Record<string, string | number> | undefined)
    : undefined;
  if (input.id && !prev) throw new Error("no product");
  const keep = <T,>(v: T | undefined, k: string, fb: T): T => (v !== undefined ? v : ((prev?.[k] ?? fb) as T));
  const keepStr = (v: string | undefined, k: string, fb = ""): string => (v !== undefined ? v : String(prev?.[k] ?? fb));
  const BEHAVIORS = ["stocked", "serialized", "batch_tracked", "weighted", "service", "digital", "made_to_order"];
  const behavior = input.behavior !== undefined
    ? (BEHAVIORS.includes(input.behavior) ? input.behavior : "stocked")
    : keepStr(undefined, "behavior", "stocked");
  const media = JSON.stringify(input.media ?? JSON.parse(String(prev?.media ?? "[]"))).slice(0, 2000);
  const seo = JSON.stringify(input.seo ?? JSON.parse(String(prev?.seo ?? "{}"))).slice(0, 1000);
  const attrs = JSON.stringify(input.attrs ?? JSON.parse(String(prev?.attrs ?? "{}"))).slice(0, 2000);
  const specs = JSON.stringify(input.specs ?? JSON.parse(String(prev?.specs ?? "{}"))).slice(0, 4000);
  const images = JSON.stringify((input.images ?? JSON.parse(String(prev?.images ?? "[]"))).slice(0, 10)).slice(0, 4000);
  const videos = JSON.stringify((input.videos ?? JSON.parse(String(prev?.videos ?? "[]"))).slice(0, 3)).slice(0, 2000);
  // Ledger-first stock: explicit/create stock routes through inventory moves
  // (A1). Column keeps the pre-move value so ensureLevel never double-seeds.
  const explicitStock = input.id && input.stock !== undefined ? Math.max(0, Math.round(input.stock)) : null;
  const openingQty = !input.id && (input.stock ?? 0) > 0 ? Math.max(0, Math.round(input.stock ?? 0)) : 0;
  const stockCell = openingQty > 0 ? 0
    : explicitStock !== null ? Math.max(0, Math.round(Number(prev?.stock ?? 0)))
    : Math.max(0, Math.round(keep(input.stock, "stock", 0)));
  const vals = [input.name.slice(0, 150), keepStr(input.sku, "sku"), keepStr(input.kind, "kind", "physical"),
    Math.max(0, Math.round(keep(input.price, "price", 0))), Math.max(0, Math.round(keep(input.mrp, "mrp", 0))),
    keepStr(input.unit, "unit", "pc"), Math.max(1, Math.round(keep(input.perPack, "perPack", 1))),
    Math.max(0, keep(input.taxPct, "taxPct", 0) as number), stockCell,
    keepStr(input.status, "status", "active"), media, seo, attrs,
    keepStr(input.category, "category"), keepStr(input.subcategory, "subcategory"),
    keepStr(input.shortDesc, "shortDesc"), keepStr(input.description, "description"), specs, images, videos,
    keepStr(input.barcode, "barcode"), input.barcodeType !== undefined ? bt : keepStr(input.barcodeType, "barcodeType"), keepStr(input.bin, "bin"), behavior];
  const cols = `name=?, sku=?, kind=?, price=?, mrp=?, unit=?, perPack=?, taxPct=?, stock=?, status=?, media=?, seo=?, attrs=?,
    category=?, subcategory=?, shortDesc=?, description=?, specs=?, images=?, videos=?, barcode=?, barcodeType=?, bin=?, behavior=?`;
  const names = `name, sku, kind, price, mrp, unit, perPack, taxPct, stock, status, media, seo, attrs,
    category, subcategory, shortDesc, description, specs, images, videos, barcode, barcodeType, bin, behavior`;
  if (input.id) {
    db.prepare(`UPDATE Product SET ${cols} WHERE id=?`).run(...vals, input.id);
    if (explicitStock !== null) setProductStock(input.id, explicitStock, "admin edit");
    return input.id;
  }
  const r = db.prepare(`INSERT INTO Product (${names}) VALUES (${vals.map(() => "?").join(",")})`).run(...vals);
  const id = Number(r.lastInsertRowid);
  // Default shelf barcode (in-store EAN range) when none given — editable later.
  if (!(input.barcode ?? "").trim()) {
    db.prepare("UPDATE Product SET barcode=?, barcodeType=? WHERE id=?").run(eanFromId(id), "ean", id);
  }
  if (openingQty > 0) openProductStock(id, openingQty);
  return id;
}

// Scan lookup: exact barcode (product or variant), then SKU fallback.
// Price is batch-aware (FEFO lot sell wins) so the counter shows the real
// sell price even when the base price is 0 (batch-priced inventory).
export function productByCode(code: string): { productId: number; variantId: number; name: string; price: number; stock: number; type: string } | null {
  commerceTables();
  const db = getDb();
  const c = code.trim().slice(0, 40);
  if (!c) return null;
  const v = db.prepare(`SELECT v.productId, v.id variantId, p.name || ' / ' || v.name name,
    CASE WHEN v.price > 0 THEN v.price ELSE p.price END price, v.stock, COALESCE(v.barcodeType,'') type FROM ProductVariant v
    JOIN Product p ON p.id=v.productId WHERE v.barcode=? LIMIT 1`).get(c) as
    { productId: number; variantId: number; name: string; price: number; stock: number; type: string } | undefined;
  if (v) {
    const lot = lotPrice(v.productId);
    return lot ? { ...v, price: lot.price } : v;
  }
  const p = db.prepare("SELECT id productId, 0 variantId, name, price, stock, COALESCE(barcodeType,'SKU') type FROM Product WHERE (barcode=? OR sku=?) AND status='active' LIMIT 1").get(c, c) as
    { productId: number; variantId: number; name: string; price: number; stock: number; type: string } | undefined;
  if (!p) return null;
  const lot = lotPrice(p.productId);
  return lot ? { ...p, price: lot.price } : p;
}

// ---- extensions (rental / digital / subscription / event stubs) ----
export const EXT_KINDS = ["rental", "digital", "subscription", "event"];

export function getExt(productId: number) {
  commerceTables();
  return getDb().prepare("SELECT kind, payload FROM ProductExt WHERE productId=?").get(productId) ?? null;
}

export function saveExt(productId: number, kind: string, payload: Record<string, string>): void {
  commerceTables();
  if (!EXT_KINDS.includes(kind)) throw new Error("bad kind");
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload).slice(0, 12)) clean[k.slice(0, 40)] = String(v).slice(0, 300);
  getDb().prepare("INSERT INTO ProductExt (productId, kind, payload) VALUES (?,?,?) ON CONFLICT(productId) DO UPDATE SET kind=excluded.kind, payload=excluded.payload, updatedAt=datetime('now')")
    .run(productId, kind, JSON.stringify(clean));
}

export function setAvail(productId: number, avail: string): void {
  commerceTables();
  const ok = ["in_stock", "out_of_stock", "preorder", "backorder", "coming_soon", "discontinued"];
  if (!ok.includes(avail)) throw new Error("bad availability");
  getDb().prepare("UPDATE Product SET avail=? WHERE id=?").run(avail, productId);
}

// Heuristic categorizer (local keyword rules — honest hook where a model plugs in).
const CATEGORY_HINTS: [RegExp, string, string][] = [
  [/milk|rice|atta|dal|oil|snack|biscuit|tea|coffee|frozen|canned|food/i, "Packaged Food", "Grocery"],
  [/shirt|tshirt|jean|kurta|saree|dress|shoe|garment|apparel/i, "Apparel", "Clothing"],
  [/phone|mobile|laptop|charger|cable|electronic|gadget|appliance/i, "Electronics", "Devices"],
  [/soap|shampoo|cream|lotion|cosmetic|pharma|tablet|syrup/i, "Personal Care", "Health"],
  [/cement|paint|pipe|wire|tool|hardware/i, "Hardware", "Tools"],
];

export function suggestCategory(name: string): { category: string; subcategory: string; confidence: "rule" } {
  for (const [re, category, subcategory] of CATEGORY_HINTS) {
    if (re.test(name)) return { category, subcategory, confidence: "rule" };
  }
  return { category: "General", subcategory: "Misc", confidence: "rule" };
}
export function getProductFull(id: number) {
  commerceTables();
  const db = getDb();
  const p = db.prepare("SELECT * FROM Product WHERE id=?").get(id) as
    { category?: string; [k: string]: unknown } | undefined;
  if (!p) return null;
  const variants = db.prepare("SELECT * FROM ProductVariant WHERE productId=? ORDER BY id").all(id);
  const similar = p.category
    ? db.prepare("SELECT id, name, price, mrp, images FROM Product WHERE category=? AND id!=? AND status='active' ORDER BY id DESC LIMIT 4").all(p.category, id)
    : [];
  return { product: p, variants, similar, ext: getExt(id) };
}

export function saveVariant(input: { id?: number; productId: number; name?: string; sku?: string; attrs?: Record<string, string>; price?: number; mrp?: number; stock?: number; barcode?: string; barcodeType?: string }): number {
  commerceTables();
  const db = getDb();
  if (!db.prepare("SELECT id FROM Product WHERE id=?").get(input.productId)) throw new Error("no product");
  const attrs = JSON.stringify(input.attrs ?? {}).slice(0, 1000);
  const bt = BARCODES.includes(input.barcodeType ?? "") ? (input.barcodeType ?? "") : "";
  if (input.id) {
    db.prepare("UPDATE ProductVariant SET name=?, sku=?, attrs=?, price=?, mrp=?, stock=?, barcode=?, barcodeType=? WHERE id=? AND productId=?")
      .run((input.name ?? "").slice(0, 120), (input.sku ?? "").slice(0, 40), attrs,
        Math.max(0, Math.round(input.price ?? 0)), Math.max(0, Math.round(input.mrp ?? 0)), Math.max(0, Math.round(input.stock ?? 0)),
        (input.barcode ?? "").slice(0, 40), bt, input.id, input.productId);
    return input.id;
  }
  return Number(db.prepare("INSERT INTO ProductVariant (productId, name, sku, attrs, price, mrp, stock, barcode, barcodeType) VALUES (?,?,?,?,?,?,?,?,?)")
    .run(input.productId, (input.name ?? "").slice(0, 120), (input.sku ?? "").slice(0, 40), attrs,
      Math.max(0, Math.round(input.price ?? 0)), Math.max(0, Math.round(input.mrp ?? 0)), Math.max(0, Math.round(input.stock ?? 0)),
      (input.barcode ?? "").slice(0, 40), bt).lastInsertRowid);
}

export function deleteVariant(id: number, productId: number): void {
  commerceTables();
  getDb().prepare("DELETE FROM ProductVariant WHERE id=? AND productId=?").run(id, productId);
}

// Ratings roll up from approved reviews only.
export function refreshRating(productId: number): void {
  commerceTables();
  const db = getDb();
  const r = db.prepare("SELECT COUNT(*) n, COALESCE(AVG(rating),0) a FROM Review WHERE productId=? AND status='approved'").get(productId) as
    { n: number; a: number };
  db.prepare("UPDATE Product SET ratingAvg=?, ratingCount=? WHERE id=?").run(Math.round(r.a * 10) / 10, r.n, productId);
}

// ---- wishlist + views (customer side) ----
export function wishList(customerId: number) {
  commerceTables();
  return getDb().prepare(`SELECT p.id, p.name, p.price, p.images FROM Wishlist w JOIN Product p ON p.id=w.productId
    WHERE w.customerId=? ORDER BY w.at DESC LIMIT 50`).all(customerId);
}

export function wishToggle(customerId: number, productId: number): { wished: boolean } {
  commerceTables();
  const db = getDb();
  if (customerId <= 0) throw new Error("sign in to wishlist");
  const ex = db.prepare("SELECT productId FROM Wishlist WHERE customerId=? AND productId=?").get(customerId, productId);
  if (ex) {
    db.prepare("DELETE FROM Wishlist WHERE customerId=? AND productId=?").run(customerId, productId);
    return { wished: false };
  }
  db.prepare("INSERT INTO Wishlist (customerId, productId) VALUES (?,?)").run(customerId, productId);
  return { wished: true };
}

export function logView(fp: string, customerId: number, productId: number): void {
  commerceTables();
  getDb().prepare("INSERT INTO ProductView (fp, customerId, productId) VALUES (?,?,?)")
    .run(fp.slice(0, 80), customerId, productId);
}

export function lastViewed(fp: string, customerId = 0, limit = 8) {
  commerceTables();
  return getDb().prepare(`SELECT p.id, p.name, p.price, p.images FROM ProductView v JOIN Product p ON p.id=v.productId
    WHERE (v.fp=? OR (? > 0 AND v.customerId=?)) GROUP BY p.id ORDER BY MAX(v.id) DESC LIMIT ?`)
    .all(fp.slice(0, 80), customerId, customerId, Math.min(20, limit));
}

// WhatsApp-ready catalogue text (name · price · short). Used by /api/wa/catalog.
export function catalogueText(limit: number): { count: number; text: string } {
  commerceTables();
  const n = Math.min(30, Math.max(1, limit));
  const items = (listProducts({ status: "active", limit: 100 }) as
    { name: string; price: number; shortDesc: string }[]).slice(0, n);
  const text = ["*Our catalogue* 🛍️", ...items.map((p, i) =>
    `${i + 1}. ${p.name} — ₹${(p.price / 100).toFixed(0)}${p.shortDesc ? `\n   ${p.shortDesc.slice(0, 80)}` : ""}`),
    items.length ? "_Reply with the item number to order_" : "_Catalogue is empty — add products in Shop_",
  ].join("\n");
  return { count: items.length, text };
}
export function listBins(warehouseId = 0) {
  commerceTables();
  const db = getDb();
  if (warehouseId) {
    return db.prepare("SELECT * FROM BinLoc WHERE warehouseId=? ORDER BY floor, rack, shelf").all(warehouseId);
  }
  return db.prepare("SELECT * FROM BinLoc ORDER BY warehouseId, floor, rack, shelf").all();
}

export function saveBin(input: { id?: number; warehouseId?: number; floor?: string; rack?: string; shelf?: string; code?: string }): number {
  commerceTables();
  const db = getDb();
  const code = (input.code || [input.floor, input.rack, input.shelf].filter(Boolean).join("-")).slice(0, 40).toUpperCase() || "BIN";
  if (input.id) {
    db.prepare("UPDATE BinLoc SET warehouseId=?, floor=?, rack=?, shelf=?, code=? WHERE id=?")
      .run(input.warehouseId ?? 1, (input.floor ?? "").slice(0, 20), (input.rack ?? "").slice(0, 20),
        (input.shelf ?? "").slice(0, 20), code, input.id);
    return input.id;
  }
  return Number(db.prepare("INSERT INTO BinLoc (warehouseId, floor, rack, shelf, code) VALUES (?,?,?,?,?)")
    .run(input.warehouseId ?? 1, (input.floor ?? "").slice(0, 20), (input.rack ?? "").slice(0, 20),
      (input.shelf ?? "").slice(0, 20), code).lastInsertRowid);
}

// ---- batches / lots (mfg + expiry mapped per product) ----
export function listLots(productId: number) {
  commerceTables();
  return getDb().prepare("SELECT * FROM ProductLot WHERE productId=? ORDER BY id DESC").all(productId);
}

export function findLot(lot: string) {
  commerceTables();
  const lots = getDb().prepare(`SELECT l.*, p.name pname, p.id pid, p.barcode, p.barcodeType, p.images, p.stock,
    COALESCE((SELECT SUM(ol.qty) FROM OrderLine ol JOIN ShopOrder o ON o.id=ol.orderId
      WHERE ol.productId=l.productId AND o.status!='cancelled'), 0) sold
    FROM ProductLot l JOIN Product p ON p.id=l.productId
    WHERE l.lot LIKE ? ORDER BY l.id DESC LIMIT 10`).all(`%${lot.slice(0, 40)}%`);
  return lots;
}

// Lifetime sold qty (confirmed pipeline) — powers batch/product sold counters.
export function soldQty(productId: number): number {
  commerceTables();
  return (getDb().prepare(`SELECT COALESCE(SUM(ol.qty),0) s FROM OrderLine ol JOIN ShopOrder o ON o.id=ol.orderId
    WHERE ol.productId=? AND o.status!='cancelled'`).get(productId) as { s: number }).s;
}

export function saveLot(input: { id?: number; productId: number; lot?: string; mfg?: string; exp?: string; qty?: number; cost?: number; sell?: number; notes?: string }): number {
  commerceTables();
  const db = getDb();
  if (!db.prepare("SELECT id FROM Product WHERE id=?").get(input.productId)) throw new Error("no product");
  const cost = Math.max(0, Math.round(input.cost ?? 0));
  const sell = Math.max(0, Math.round(input.sell ?? 0));
  if (input.id) {
    db.prepare("UPDATE ProductLot SET lot=?, mfg=?, exp=?, qty=?, cost=?, sell=?, notes=? WHERE id=? AND productId=?")
      .run((input.lot ?? "").slice(0, 40), (input.mfg ?? "").slice(0, 10), (input.exp ?? "").slice(0, 10),
        Math.max(0, input.qty ?? 0), cost, sell, (input.notes ?? "").slice(0, 200), input.id, input.productId);
    return input.id;
  }
  return Number(db.prepare("INSERT INTO ProductLot (productId, lot, mfg, exp, qty, cost, sell, notes) VALUES (?,?,?,?,?,?,?,?)")
    .run(input.productId, (input.lot ?? "").slice(0, 40), (input.mfg ?? "").slice(0, 10), (input.exp ?? "").slice(0, 10),
      Math.max(0, input.qty ?? 0), cost, sell, (input.notes ?? "").slice(0, 200)).lastInsertRowid);
}

// Batch sell price: FEFO-first lot with stock and a set sell price. Empty
// (0) means the lot carries no price — tiers/base decide below.
export function lotPrice(productId: number): { price: number; lot: string } | null {
  commerceTables();
  try {
    const lots = fefoLots(productId) as { lot: string; sell?: number }[];
    const hit = lots.find((l) => Number(l.sell ?? 0) > 0);
    return hit ? { price: Number(hit.sell), lot: hit.lot } : null;
  } catch { return null; }
}

export function deleteLot(id: number, productId: number): void {
  commerceTables();
  getDb().prepare("DELETE FROM ProductLot WHERE id=? AND productId=?").run(id, productId);
}

// ---- channels + tiered prices ----
export const SALE_CHANNELS = ["pos", "online", "marketplace", "wholesale", "api", "social"];

export function channelsOf(productId: number): Record<string, { enabled: boolean; onlinePrice: number }> {
  commerceTables();
  const out: Record<string, { enabled: boolean; onlinePrice: number }> = {};
  for (const r of getDb().prepare("SELECT channel, enabled, onlinePrice FROM ProductChannel WHERE productId=?").all(productId) as
    { channel: string; enabled: number; onlinePrice: number }[]) {
    out[r.channel] = { enabled: r.enabled === 1, onlinePrice: r.onlinePrice };
  }
  return out;
}

export function saveChannel(productId: number, channel: string, input: { enabled?: boolean; onlinePrice?: number; minQty?: number; maxQty?: number }): void {
  commerceTables();
  if (!SALE_CHANNELS.includes(channel)) throw new Error("bad channel");
  getDb().prepare(`INSERT INTO ProductChannel (productId, channel, enabled, onlinePrice, minQty, maxQty) VALUES (?,?,?,?,?,?)
    ON CONFLICT(productId, channel) DO UPDATE SET enabled=excluded.enabled, onlinePrice=excluded.onlinePrice, minQty=excluded.minQty, maxQty=excluded.maxQty`)
    .run(productId, channel, input.enabled === false ? 0 : 1,
      Math.max(0, Math.round(input.onlinePrice ?? 0)), input.minQty ?? 0, input.maxQty ?? 0);
}

export function channelEnabled(productId: number, channel: string): boolean {
  commerceTables();
  const r = getDb().prepare("SELECT enabled FROM ProductChannel WHERE productId=? AND channel=?").get(productId, channel) as
    { enabled: number } | undefined;
  return r ? r.enabled === 1 : true; // unconfigured = omnichannel
}

export function listPrices(productId: number) {
  commerceTables();
  return getDb().prepare("SELECT * FROM ProductPrice WHERE productId=? ORDER BY priceType").all(productId);
}

export function savePrice(input: { id?: number; productId: number; variantId?: number; priceType: string; amount: number; minQty?: number; startsAt?: string; endsAt?: string; active?: boolean }): number {
  commerceTables();
  const types = ["mrp", "retail", "pos", "online", "wholesale", "marketplace", "member", "sale", "promotional", "cost"];
  if (!types.includes(input.priceType)) throw new Error("bad price type");
  const db = getDb();
  if (input.id) {
    db.prepare("UPDATE ProductPrice SET priceType=?, amount=?, minQty=?, startsAt=?, endsAt=?, active=? WHERE id=? AND productId=?")
      .run(input.priceType, Math.max(0, Math.round(input.amount)), Math.max(0, input.minQty ?? 0),
        (input.startsAt ?? "").slice(0, 10), (input.endsAt ?? "").slice(0, 10), input.active === false ? 0 : 1, input.id, input.productId);
    return input.id;
  }
  return Number(db.prepare("INSERT INTO ProductPrice (productId, variantId, priceType, amount, minQty, startsAt, endsAt, active) VALUES (?,?,?,?,?,?,?,?)")
    .run(input.productId, input.variantId ?? 0, input.priceType, Math.max(0, Math.round(input.amount)),
      Math.max(0, input.minQty ?? 0), (input.startsAt ?? "").slice(0, 10), (input.endsAt ?? "").slice(0, 10),
      input.active === false ? 0 : 1).lastInsertRowid);
}

export function deletePrice(id: number, productId: number): void {
  commerceTables();
  getDb().prepare("DELETE FROM ProductPrice WHERE id=? AND productId=?").run(id, productId);
}

export function priceFor(productId: number, opts: { channel?: string; qty?: number; cgroup?: string } = {}): { price: number; source: string } {
  commerceTables();
  const db = getDb();
  const p = db.prepare("SELECT price FROM Product WHERE id=?").get(productId) as { price: number } | undefined;
  if (!p) throw new Error("no product");
  // Batch sell price wins (FEFO lot) — price lives on the lot, then tiers, then base.
  const lot = lotPrice(productId);
  if (lot) return { price: lot.price, source: `batch:${lot.lot || "lot"}` };
  const rows = db.prepare("SELECT priceType, amount, minQty, startsAt, endsAt, active FROM ProductPrice WHERE productId=? AND active=1").all(productId) as unknown as PriceRow[];
  return resolvePrice(p.price, rows, opts);
}

// ---- quote + orders ----
export function orderChannel(channel: string): string {
  if (channel === "pos") return "pos";
  if (channel.startsWith("web-")) return "online";
  if (channel.startsWith("market:")) return "marketplace";
  if (channel === "wholesale") return "wholesale";
  return "retail";
}

export function quote(input: { lines: { productId: number; qty: number }[]; coupon?: string; inter?: boolean; channel?: string; customerId?: number; manualDiscount?: number }): Quote {
  commerceTables();
  const db = getDb();
  const ch = orderChannel(input.channel ?? "");
  let cgroup = "";
  if (input.customerId) {
    const c = db.prepare("SELECT cgroup FROM Customer WHERE id=?").get(input.customerId) as { cgroup: string } | undefined;
    cgroup = c?.cgroup ?? "";
  }
  const lines = input.lines.slice(0, 50).map((l) => {
    const p = db.prepare("SELECT id, price, taxPct FROM Product WHERE id=? AND status='active'").get(l.productId) as
      { id: number; price: number; taxPct: number } | undefined;
    if (!p) throw new Error(`product ${l.productId} unavailable`);
    if (!channelEnabled(l.productId, ch) && ch !== "retail") throw new Error(`product ${l.productId} not sold on ${ch}`);
    const qty = Math.max(0.001, l.qty);
    const { price } = priceFor(l.productId, { channel: ch, qty, cgroup });
    return { productId: p.id, qty, price, taxPct: p.taxPct };
  });
  const coupon = input.coupon ? getCoupon(input.coupon) ?? undefined : undefined;
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  // Cashier override (flag-gated upstream): flat top-up on top of any coupon,
  // spread proportionally so tax stays consistent. Capped — never negative.
  const manual = Math.min(Math.max(0, Math.round(input.manualDiscount ?? 0)), Math.max(0, subtotal - (coupon ? couponOff(subtotal, coupon).off : 0)));
  const combined: CouponDef | undefined = coupon
    ? { ...coupon, kind: "flat", value: couponOff(subtotal, coupon).off + manual, maxOff: undefined }
    : manual > 0 ? { code: "MANUAL", kind: "flat", value: manual } : undefined;
  return quoteCart(lines, { inter: !!input.inter, inclusive: true, coupon: combined });
}

export async function createOrder(input: {
  customerId?: number; lines: { productId: number; qty: number }[]; coupon?: string;
  inter?: boolean; channel?: string; notes?: string; manualDiscount?: number;
}): Promise<number> {
  commerceTables();
  const db = getDb();
  if ((input.manualDiscount ?? 0) > 0) {
    const { flagOn } = await import("./flags");
    if (!flagOn("discount_override")) throw new Error("discount override is off");
  }
  const q = quote(input);
  if (!q.lines.length) throw new Error("empty cart");
  // One transaction: order + lines + reserves + coupon commit together —
  // a failed reserve can never leave a half-built draft behind.
  db.exec("BEGIN");
  try {
    const orderId = Number(db.prepare(`INSERT INTO ShopOrder (customerId, status, subtotal, discount, tax, grand, coupon, channel, notes)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(
      input.customerId ?? 0, "draft", q.subtotal, q.discount, q.taxTotal, q.grand,
      q.coupon ?? "", (input.channel ?? "admin").slice(0, 20), (input.notes ?? "").slice(0, 500)).lastInsertRowid);
    const lineIns = db.prepare("INSERT INTO OrderLine (orderId, productId, name, qty, price, total) VALUES (?,?,?,?,?,?)");
    let held = 0;
    for (const l of q.lines) {
      const p = db.prepare("SELECT name, stock, kind FROM Product WHERE id=?").get(l.productId) as
        { name: string; stock: number; kind: string };
      if (p.kind === "physical" && p.stock < l.qty) throw new Error(`${p.name}: only ${p.stock} in stock`);
      lineIns.run(orderId, l.productId, p.name.slice(0, 150), l.qty, l.price, l.price * l.qty);
      if (p.kind === "physical") {
        reserveStock(l.productId, l.qty, `order#${orderId}-reserve`);
        held++;
      }
    }
    if (q.coupon) db.prepare("UPDATE Coupon SET used = used + 1 WHERE code=?").run(q.coupon);
    log(orderId, "created", `grand ₹${(q.grand / 100).toFixed(0)} · ${q.lines.length} lines`);
    if (held > 0) log(orderId, "reserve", `${held} line${held === 1 ? "" : "s"} held for this draft`);
    db.exec("COMMIT");
    return orderId;
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch { /* already out */ }
    throw e;
  }
}

// Expired draft holds auto-release (default 48h). Returns released order ids.
export function reservationTick(maxAgeH = 48): number[] {
  commerceTables();
  const db = getDb();
  const stale = db.prepare(`SELECT id FROM ShopOrder WHERE status='draft'
    AND datetime(createdAt) < datetime('now', ?) ORDER BY id LIMIT 100`).all(`-${Math.max(1, Math.round(maxAgeH))} hours`) as
    { id: number }[];
  const out: number[] = [];
  for (const o of stale) {
    const lines = db.prepare("SELECT productId, qty FROM OrderLine WHERE orderId=?").all(o.id) as
      { productId: number; qty: number }[];
    let freed = false;
    for (const l of lines) {
      const held = reservedFor(o.id, l.productId);
      if (held > 0) {
        releaseStock(l.productId, held, `order#${o.id}-release`);
        freed = true;
      }
    }
    if (freed) {
      log(o.id, "reserve-expired", `holds older than ${maxAgeH}h released`);
      out.push(o.id);
    }
  }
  return out;
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
      // Reserve → release → issue: the hold converts into the real decrement
      // inside the same transaction. Legacy drafts without holds issue as before.
      const { issueStock, consumeFefo } = await import("./inventory");
      for (const l of db.prepare("SELECT productId, qty FROM OrderLine WHERE orderId=?").all(id) as { productId: number; qty: number }[]) {
        const p = db.prepare("SELECT kind FROM Product WHERE id=?").get(l.productId) as { kind: string } | undefined;
        if (p?.kind === "physical") {
          const held = reservedFor(id, l.productId);
          if (held > 0) releaseStock(l.productId, Math.min(held, l.qty), `order#${id}-release`);
          issueStock(l.productId, l.qty, `order#${id}`);
          const picks = consumeFefo(l.productId, l.qty);
          if (picks.length) log(id, "fefo", picks.map((x) => `${x.lot}×${x.took}`).join(","));
        }
      }
      const { earnForOrder } = await import("./crm");
      await earnForOrder(id);
    }
    if (to === "cancelled" || to === "returned") {
      // Give back what confirm took: restock physical lines, revoke earned
      // points, release the coupon use. Draft cancels only free the coupon.
      const lines = db.prepare(`SELECT l.productId, l.qty, p.kind FROM OrderLine l
        LEFT JOIN Product p ON p.id=l.productId WHERE l.orderId=?`).all(id) as
        { productId: number; qty: number; kind: string }[];
      // Free any outstanding draft holds first (legacy orders hold nothing → no-op).
      let freed = false;
      for (const l of lines) {
        const held = reservedFor(id, l.productId);
        if (held > 0) {
          releaseStock(l.productId, held, `order#${id}-release`);
          freed = true;
        }
      }
      if (freed) log(id, "reserve-released", "draft holds freed");
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

// ---- udhari (credit ledger on the customer row) ----
export function udhariList() {
  commerceTables();
  return getDb().prepare("SELECT id, name, phone, balance FROM Customer WHERE balance > 0 ORDER BY balance DESC LIMIT 100").all();
}

// Credit sale: confirmed order + balance grows. Atomic with the order.
export async function creditSale(input: { customerId: number; lines: { productId: number; qty: number }[]; coupon?: string; notes?: string }): Promise<number> {
  commerceTables();
  const { flagOn } = await import("./flags");
  if (!flagOn("udhari")) throw new Error("credit sales are off");
  const db = getDb();
  const c = db.prepare("SELECT credit, balance FROM Customer WHERE id=?").get(input.customerId) as
    { credit: number; balance: number } | undefined;
  if (!c) throw new Error("no customer");
  const id = await createOrder({ customerId: input.customerId, lines: input.lines, coupon: input.coupon, channel: "credit", notes: input.notes });
  const o = db.prepare("SELECT grand FROM ShopOrder WHERE id=?").get(id) as { grand: number };
  if (c.credit > 0 && c.balance + o.grand > c.credit) {
    db.prepare("DELETE FROM OrderLine WHERE orderId=?").run(id);
    db.prepare("DELETE FROM ShopOrder WHERE id=?").run(id);
    throw new Error(`credit limit exceeded`);
  }
  await setOrderStatus(id, "confirmed");
  db.prepare("UPDATE Customer SET balance = balance + ? WHERE id=?").run(o.grand, input.customerId);
  logCustomerSafe(input.customerId, `udhari + order #${id}`);
  return id;
}

function logCustomerSafe(customerId: number, detail: string): void {
  try {
    getDb().prepare("INSERT INTO CustomerEvent (customerId, kind, detail) VALUES (?,?,?)").run(customerId, "udhari", detail.slice(0, 500));
  } catch { /* timeline never breaks money */ }
}

// Collection against udhari: balance shrinks, cash lands, ledger posts.
export function collectUdhari(customerId: number, amount: number, method = "cash", accountId = 1): { left: number } {
  commerceTables();
  const db = getDb();
  const c = db.prepare("SELECT balance FROM Customer WHERE id=?").get(customerId) as { balance: number } | undefined;
  if (!c) throw new Error("no customer");
  const take = Math.min(Math.max(1, Math.round(amount)), c.balance);
  if (take <= 0) throw new Error("nothing due");
  db.exec("BEGIN");
  try {
    db.prepare("UPDATE Customer SET balance = balance - ? WHERE id=?").run(take, customerId);
    bankMove(accountId, "in", take, `udhari#${customerId}`, method);
    ledgerPost({ kind: "payment", refId: customerId, amount: take, memo: `udhari collect (${method})` });
    db.exec("COMMIT");
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch { /* already out */ }
    throw e;
  }
  logCustomerSafe(customerId, `udhari collect (${method})`);
  return { left: c.balance - take };
}

// Public checkout: find-or-make customer by phone → draft order (team confirms).
export async function publicCheckout(input: {
  name: string; phone: string; address?: string;
  lines: { productId: number; qty: number }[]; coupon?: string; method?: string;
}): Promise<{ orderId: number; grand: number }> {
  commerceTables();
  const { flagOn } = await import("./flags");
  if (!flagOn("checkout")) throw new Error("checkout is off");
  const method = input.method === "upi" ? "upi" : "cod";
  if (method === "cod" && !flagOn("cod")) throw new Error("COD is off");
  const db = getDb();
  const phone = input.phone.replace(/\D/g, "").slice(-10);
  if (phone.length < 10) throw new Error("valid phone required");
  const c = db.prepare("SELECT id FROM Customer WHERE phone LIKE ?").get(`%${phone}`) as { id: number } | undefined;
  const cid = c?.id ?? saveCustomer({ name: input.name.slice(0, 120), phone, notes: (input.address ?? "").slice(0, 300) });
  const id = await createOrder({ customerId: cid, lines: input.lines, coupon: input.coupon, channel: `web-${method}`, notes: (input.address ?? "").slice(0, 300) });
  const o = db.prepare("SELECT grand FROM ShopOrder WHERE id=?").get(id) as { grand: number };
  return { orderId: id, grand: o.grand };
}
