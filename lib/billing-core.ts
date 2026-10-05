// Pure billing math (no sqlite — safe for vitest).

export type DocType = "invoice" | "proforma" | "estimate" | "quotation" | "credit-note" | "debit-note" | "receipt" | "challan";

export const DOC_PREFIX: Record<DocType, string> = {
  invoice: "INV", proforma: "PER", estimate: "EST", quotation: "QUO",
  "credit-note": "CN", "debit-note": "DN", receipt: "RCT", challan: "DC",
};

// INV-2026-0007 — parse back for validation.
export function formatDocNo(prefix: string, year: number, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

export function parseDocNo(no: string): { prefix: string; year: number; seq: number } | null {
  const m = /^([A-Z]{2,3})-(\d{4})-(\d{4,})$/.exec(no.trim().toUpperCase());
  if (!m) return null;
  return { prefix: m[1], year: Number(m[2]), seq: Number(m[3]) };
}

// Refund must not exceed the paid amount minus prior refunds.
export function refundable(paid: number, refunded: number, asked: number): { ok: boolean; amount: number; reason?: string } {
  const left = paid - refunded;
  if (asked <= 0) return { ok: false, amount: 0, reason: "amount must be positive" };
  if (asked > left) return { ok: false, amount: 0, reason: `only ₹${(left / 100).toFixed(0)} refundable` };
  return { ok: true, amount: Math.round(asked) };
}

// Straight-line book value: value * (1 - depPct/100 * fullYears), floored at 0.
export function bookValue(value: number, depPct: number, purchasedAt: string, now = Date.now()): number {
  const bought = new Date(purchasedAt).getTime();
  if (!Number.isFinite(bought) || bought > now) return Math.max(0, Math.round(value));
  const years = (now - bought) / (365.25 * 86400_000);
  return Math.max(0, Math.round(value * (1 - (Math.max(0, depPct) / 100) * Math.floor(years))));
}

// Net a list of bank transactions into a balance.
export function accountBalance(opening: number, txs: { kind: string; amount: number }[]): number {
  return txs.reduce((b, t) => b + (t.kind === "in" ? t.amount : -t.amount), opening);
}
