// Pure demand math (no sqlite — safe for vitest). Velocity from daily sale
// totals; cover and suggested top-up in the same units. Suggestions are
// advice — never auto-orders.
export interface DailySale {
  day: string;
  qty: number;
}

/** Mean daily units over the window (0 when no history). */
export function dailyVelocity(sales: DailySale[], windowDays = 28): number {
  const w = Math.min(365, Math.max(1, Math.round(windowDays) || 28));
  const total = sales.reduce((s, x) => s + Math.max(0, x.qty), 0);
  return total / w;
}

/** Sale-active days inside the history (thin history reads as uncertain). */
export function activeDays(sales: DailySale[]): number {
  return new Set(sales.filter((x) => x.qty > 0).map((x) => x.day.slice(0, 10))).size;
}

/** Days of cover at current velocity, or null when nothing moves. */
export function coverDays(stock: number, velocity: number): number | null {
  if (!(velocity > 0)) return null;
  return Math.max(0, stock) / velocity;
}

/**
 * Suggested top-up to reach target cover plus a safety buffer.
 * Zero when already covered; slow/no-history lines report via history flag.
 */
export function suggestQty(stock: number, velocity: number, targetDays = 21, safetyDays = 7): number {
  if (!(velocity > 0)) return 0;
  const want = velocity * (Math.max(0, targetDays) + Math.max(0, safetyDays));
  return Math.max(0, Math.ceil(want - Math.max(0, stock)));
}

export type HistoryClass = "ok" | "thin" | "none";

/** ok (7+ active days), thin (some), none (no sales at all). */
export function historyClass(sales: DailySale[]): HistoryClass {
  const n = activeDays(sales);
  if (n >= 7) return "ok";
  if (n > 0) return "thin";
  return "none";
}

export interface ReceiptLag { orderedAt: string; receivedAt: string }

// Mean PO-to-GRN lag in days over recent receipts (null = unknown, never 0).
export function meanLeadTime(receipts: ReceiptLag[]): number | null {
  const lags: number[] = [];
  for (const r of receipts.slice(0, 10)) {
    const a = Date.parse(r.orderedAt || "");
    const b = Date.parse(r.receivedAt || "");
    if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) continue;
    lags.push((b - a) / 86400000);
  }
  if (!lags.length) return null;
  return Math.round((lags.reduce((s, x) => s + x, 0) / lags.length) * 10) / 10;
}
