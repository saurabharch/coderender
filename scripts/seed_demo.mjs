// Demo seed: sample catalog proving batch pricing, variants, kits, loyalty.
// Guarded: refuses unless Product is empty (never pollutes real data).
// Usage: DB_PATH=dev.db node scripts/seed_demo.mjs [--force]
// Ledger rows mirror exactly what the APIs write (opening/in moves).
import { DatabaseSync } from "node:sqlite";

const dbPath = process.env.DB_PATH || "dev.db";
const force = process.argv.includes("--force");
const db = new DatabaseSync(dbPath);

const count = (t) => {
  try { return db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c; }
  catch { return -1; }
};
if (count("Product") !== 0 && !force) {
  console.log(`refusing: Product has ${count("Product")} rows (use --force to override)`);
  process.exit(1);
}

const now = new Date().toISOString().slice(0, 19).replace("T", " ");
const ins = (t, cols, vals) => Number(db.prepare(
  `INSERT INTO ${t} (${cols}) VALUES (${vals.map(() => "?").join(",")})`).run(...vals).lastInsertRowid);

function product(name, { price = 0, stock = 0, category = "Demo", barcode = "" } = {}) {
  const id = ins("Product",
    "name,price,stock,category,barcode,barcodeType,status,createdAt",
    [name, price, stock, category, barcode, barcode ? "custom" : "", "active", now]);
  if (stock > 0) {
    db.prepare("INSERT INTO StockLevel (productId,warehouseId,qty,avgCost) VALUES (?,?,?,?)").run(id, 1, stock, 0);
    db.prepare("INSERT INTO StockMove (productId,warehouseId,kind,qty,ref,cost) VALUES (?,?,?,?,?,?)")
      .run(id, 1, "in", stock, "opening", 0);
  }
  return id;
}

// 1. Batch-priced staple (base 0 — price lives on the lot).
const atta = product("Demo Atta 5kg", { stock: 20, category: "Grocery" });
db.prepare("INSERT INTO ProductLot (productId,lot,mfg,exp,qty,cost,sell,active) VALUES (?,?,?,?,?,?,?,1)")
  .run(atta, "L-DEMO-1", "2026-01", "2027-01", 20, 18000, 22000);

// 2. Matrix variants (Red/Blue × S/M) with systematic SKUs.
const tee = product("Demo Tee", { stock: 0, category: "Apparel" });
for (const c of ["Red", "Blue"]) for (const s of ["S", "M"]) {
  db.prepare(`INSERT INTO ProductVariant
    (productId,name,sku,attrs,price,stock,active) VALUES (?,?,?,?,?,?,1)`).run(
    tee, `${c} / ${s}`, `P${tee}-${c.toUpperCase()}-${s}`,
    JSON.stringify({ kind: "count", unit: "pc", color: c, size: s }), 0, 0);
}

// 3. Kit (2×atta-sibling + 1×sugar) sold at its own price.
const sugar = product("Demo Sugar 1kg", { price: 5000, stock: 30, category: "Grocery" });
const hamper = product("Demo Hamper", { price: 55000, stock: 0, category: "Grocery" });
db.prepare("INSERT INTO BundleItem (bundleId,productId,qty) VALUES (?,?,?)").run(hamper, atta, 1);
db.prepare("INSERT INTO BundleItem (bundleId,productId,qty) VALUES (?,?,?)").run(hamper, sugar, 2);

// 4. Customer + coupon.
db.prepare("INSERT INTO Customer (name,phone,stage) VALUES (?,?,?)").run("Demo Customer", "9000000000", "new");
db.prepare("INSERT INTO Coupon (code,kind,value,active) VALUES (?,?,?,1)").run("DEMO10", "pct", 10);

console.log("seeded: 4 products, 4 variants, 1 lot, 1 kit, 1 customer, 1 coupon");
