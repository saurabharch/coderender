// Pure plan-price math (no sqlite — safe for vitest).
// price = list price (charge basis when no offer). mrp = compare-at.
// offer: off | flat (₹ off) | pct (% off). Badge: none | new | offer | new-price.

export type OfferMode = "off" | "flat" | "pct";
export type PlanBadge = "none" | "new" | "offer" | "new-price";

export function normOfferMode(v: unknown): OfferMode {
  return v === "flat" || v === "pct" ? v : "off";
}

export function normBadge(v: unknown): PlanBadge {
  return v === "new" || v === "offer" || v === "new-price" ? v : "none";
}

export interface EffectivePrice { charge: number; struck: number; pctOff: number; onOffer: boolean }

// Effective price: offer applies to price (never below 0, never above
// price); mrp shows struck only when honestly above the charge.
export function planEffective(input: {
  price: number; mrp?: number; offerMode?: unknown; offerValue?: number;
}): EffectivePrice {
  const price = Math.max(0, Math.round(Number(input.price) || 0));
  const mode = normOfferMode(input.offerMode);
  const val = Math.max(0, Number(input.offerValue) || 0);
  let charge = price;
  if (mode === "flat") charge = Math.max(0, price - Math.round(val));
  if (mode === "pct") charge = Math.max(0, Math.round(price * (1 - Math.min(100, val) / 100)));
  const mrp = Math.max(0, Math.round(Number(input.mrp) || 0));
  const struck = mrp > charge ? mrp : 0;
  const base = Math.max(charge, price, mrp);
  const pctOff = base > 0 && charge < base ? Math.round(((base - charge) / base) * 100) : 0;
  return { charge, struck, pctOff, onOffer: charge < price || struck > 0 };
}
