// Pure commerce math (no sqlite — safe for vitest). All money in paise (int).
// Tax engine is GST-shaped (CGST/SGST intra-state, IGST inter-state) but the
// rates live in the TaxRate table — nothing hard-coded per module.

export type UnitKind = "pc" | "kg" | "g" | "l" | "ml" | "m" | "cm" | "box" | "dozen" | "pack";

const UNIT_BASE: Record<UnitKind, { base: string; factor: number }> = {
  pc: { base: "pc", factor: 1 }, kg: { base: "g", factor: 1000 }, g: { base: "g", factor: 1 },
  l: { base: "ml", factor: 1000 }, ml: { base: "ml", factor: 1 },
  m: { base: "cm", factor: 100 }, cm: { base: "cm", factor: 1 },
  box: { base: "pc", factor: 1 }, dozen: { base: "pc", factor: 12 }, pack: { base: "pc", factor: 1 },
};

export function toBase(qty: number, unit: string, perPack = 1): { qty: number; unit: string } {
  const u = UNIT_BASE[unit as UnitKind];
  if (!u) return { qty, unit };
  const pack = unit === "box" || unit === "pack" ? Math.max(1, perPack) : 1;
  return { qty: qty * u.factor * pack, unit: u.base };
}

export interface TaxSplit { cgst: number; sgst: number; igst: number; total: number }

// ratePct like 18; inter=true → IGST else CGST+SGST halves. Inclusive backs tax out.
export function splitTax(amount: number, ratePct: number, inter: boolean, inclusive: boolean): TaxSplit {
  const r = Math.max(0, ratePct);
  if (r === 0) return { cgst: 0, sgst: 0, igst: 0, total: 0 };
  const total = inclusive ? Math.round((amount * r) / (100 + r)) : Math.round((amount * r) / 100);
  if (inter) return { cgst: 0, sgst: 0, igst: total, total };
  const half = Math.floor(total / 2);
  return { cgst: half, sgst: total - half, igst: 0, total };
}

export interface CouponDef {
  code: string; kind: "flat" | "pct"; value: number;
  maxOff?: number; minOrder?: number; startsAt?: string; endsAt?: string; maxUses?: number; used?: number;
}

export function couponOff(subtotal: number, c: CouponDef, now = Date.now()): { off: number; reason?: string } {
  if (subtotal < (c.minOrder ?? 0)) return { off: 0, reason: `needs ₹${((c.minOrder ?? 0) / 100).toFixed(0)}+` };
  if (c.startsAt && now < new Date(c.startsAt).getTime()) return { off: 0, reason: "not started" };
  if (c.endsAt && now > new Date(c.endsAt).getTime()) return { off: 0, reason: "expired" };
  if (c.maxUses !== undefined && (c.used ?? 0) >= c.maxUses) return { off: 0, reason: "used up" };
  const raw = c.kind === "flat" ? c.value : Math.round((subtotal * c.value) / 100);
  return { off: Math.min(raw, c.maxOff ?? raw, subtotal) };
}

export interface QuoteLine { productId: number; qty: number; price: number; taxPct: number }

export interface Quote {
  lines: (QuoteLine & { total: number; tax: TaxSplit })[];
  subtotal: number; discount: number; taxTotal: number; grand: number; coupon?: string;
}

export function quoteCart(lines: QuoteLine[], opts: { inter: boolean; inclusive: boolean; coupon?: CouponDef }): Quote {
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const { off, reason } = opts.coupon ? couponOff(subtotal, opts.coupon) : { off: 0, reason: undefined };
  const out: Quote["lines"] = [];
  let taxTotal = 0;
  for (const l of lines) {
    const total = l.price * l.qty;
    // Discount spreads proportionally so tax stays consistent.
    const share = subtotal > 0 ? Math.round((off * total) / subtotal) : 0;
    const taxable = total - share;
    const tax = splitTax(taxable, l.taxPct, opts.inter, opts.inclusive);
    taxTotal += tax.total;
    out.push({ ...l, total: taxable, tax });
  }
  const net = subtotal - off;
  return {
    lines: out, subtotal, discount: off, taxTotal,
    grand: net + (opts.inclusive ? 0 : taxTotal),
    ...(opts.coupon && !reason ? { coupon: opts.coupon.code } : {}),
  };
}

export const ORDER_FLOW: Record<string, string[]> = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["fulfilled", "cancelled"],
  fulfilled: ["returned"],
  cancelled: [],
  returned: [],
};

export function orderCan(from: string, to: string): boolean {
  return (ORDER_FLOW[from] ?? []).includes(to);
}
