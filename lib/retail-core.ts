// Pure retail math (no sqlite — safe for vitest).

export const SHIP_FLOW: Record<string, string[]> = {
  created: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered", "returned", "rto"],
  delivered: [],
  returned: [],
  rto: ["shipped"],
  cancelled: [],
};

export function shipCan(from: string, to: string): boolean {
  return (SHIP_FLOW[from] ?? []).includes(to);
}

// Abandoned: cart older than waitMs with no newer order from the customer.
export function isAbandoned(cartAt: string, lastOrderAt: string | null, now = Date.now(), waitMs = 3 * 3600_000): boolean {
  if (now - new Date(cartAt).getTime() < waitMs) return false;
  if (!lastOrderAt) return true;
  return new Date(cartAt).getTime() > new Date(lastOrderAt).getTime();
}

// Drawer settlement: counted vs expected (opening + cash sales).
export function settleDrawer(opening: number, cashIn: number, counted: number): { expected: number; diff: number } {
  const expected = opening + cashIn;
  return { expected, diff: counted - expected };
}

export const CAMPAIGN_CHANNELS = ["email", "whatsapp", "push"] as const;

export function renderMessage(template: string, vars: Record<string, string>): string {
  let out = template.slice(0, 1000);
  for (const [k, v] of Object.entries(vars)) out = out.split(`{{${k}}}`).join(v.slice(0, 200));
  return out;
}
