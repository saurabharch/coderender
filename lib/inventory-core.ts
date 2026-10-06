// Pure inventory math (no sqlite — safe for vitest).

export type MoveKind = "in" | "out" | "adjust" | "transfer" | "reserve" | "release"
  | "damage" | "expiry" | "purchase-return" | "sale-return" | "count";

// Net a list of moves into a level.
export function ledgerLevel(moves: { kind: MoveKind; qty: number; toWh?: boolean }[]): number {
  let level = 0;
  for (const m of moves) {
    if (m.kind === "in" || m.kind === "release" || m.kind === "sale-return") level += m.qty;
    else if (m.kind === "out" || m.kind === "reserve" || m.kind === "damage" || m.kind === "expiry" || m.kind === "purchase-return") level -= m.qty;
    else if (m.kind === "adjust" || m.kind === "count") level += m.qty; // signed delta
    else if (m.kind === "transfer") level += m.toWh ? m.qty : -m.qty;
  }
  return level;
}

// Moving-average unit cost after receiving qty at cost.
export function avgCost(onHand: number, avg: number, qty: number, cost: number): number {
  if (qty <= 0) return avg;
  const total = onHand + qty;
  if (total <= 0) return cost;
  return Math.round(((onHand * avg + qty * cost) / total) * 100) / 100;
}

export function needsReorder(level: number, lowAt: number): boolean {
  return level <= Math.max(0, lowAt);
}

export const PO_FLOW: Record<string, string[]> = {
  draft: ["sent", "cancelled"],
  sent: ["received", "cancelled"],
  received: ["billed"],
  billed: ["paid"],
  paid: [],
  cancelled: [],
};

export function poCan(from: string, to: string): boolean {
  return (PO_FLOW[from] ?? []).includes(to);
}
