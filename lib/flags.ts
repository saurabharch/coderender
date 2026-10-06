// Service flags: kill-switches for storefront features (checkout, wishlist,
// loyalty earn, COD, udhari). Dashboard-owned (Settings), defaults ON except
// where noted. Endpoints check flag() and 404 honestly when off.
import { getDb } from "./store";

export const SERVICE_FLAGS: Record<string, { label: string; def: boolean }> = {
  checkout: { label: "Public checkout (/checkout)", def: true },
  wishlist: { label: "Customer wishlist", def: true },
  loyalty: { label: "Loyalty earn/redeem", def: true },
  cod: { label: "Cash on delivery", def: true },
  udhari: { label: "Credit sales (udhari)", def: true },
  discount_override: { label: "Cashier discount override (bill)", def: false },
  catalog_wa: { label: "WhatsApp catalogue sends", def: true },
};

export function flagOn(key: string): boolean {
  try {
    getDb().exec(`CREATE TABLE IF NOT EXISTS ServiceFlag (key TEXT PRIMARY KEY, onOff INTEGER NOT NULL DEFAULT 1)`);
    const r = getDb().prepare("SELECT onOff FROM ServiceFlag WHERE key=?").get(key) as { onOff: number } | undefined;
    if (r) return r.onOff === 1;
  } catch { /* fall through to default */ }
  return SERVICE_FLAGS[key]?.def ?? true;
}

export function setFlag(key: string, on: boolean): void {
  if (!SERVICE_FLAGS[key]) throw new Error("unknown flag");
  getDb().exec(`CREATE TABLE IF NOT EXISTS ServiceFlag (key TEXT PRIMARY KEY, onOff INTEGER NOT NULL DEFAULT 1)`);
  getDb().prepare("INSERT INTO ServiceFlag (key, onOff) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET onOff=excluded.onOff")
    .run(key, on ? 1 : 0);
}

export function flagStates(): { key: string; label: string; on: boolean }[] {
  return Object.entries(SERVICE_FLAGS).map(([key, f]) => ({ key, label: f.label, on: flagOn(key) }));
}
