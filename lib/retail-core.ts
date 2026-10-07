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

// Courier directory: name + tracking-URL template ({tracking} placeholder).
// Templates are editable deep-links; unknown couriers fall back to plain text.
export const DEFAULT_COURIERS: { name: string; url: string }[] = [
  { name: "Delhivery", url: "https://www.delhivery.com/track/package/{tracking}" },
  { name: "Ecom Express", url: "https://ecomexpress.in/tracking/?awb_number={tracking}" },
  { name: "XpressBees", url: "https://www.xpressbees.com/track-shipment?awb={tracking}" },
  { name: "BlueDart", url: "https://www.bluedart.com/track-dartboard?trackNo={tracking}" },
  { name: "DTDC", url: "https://www.dtdc.in/tracking/tracking_results.asp?Ttype=awb_no&strCnno={tracking}" },
  { name: "India Post", url: "https://www.indiapost.gov.in/_layouts/15/DOP.Portal.Tracking/TrackConsignment.aspx" },
  { name: "Shadowfax", url: "https://shadowfax.in/tracking/?awb={tracking}" },
];

export function buildTrackingUrl(template: string, tracking: string): string | null {
  const t = tracking.trim();
  if (!t) return null;
  if (!template.includes("{tracking}")) return null;
  return template.replaceAll("{tracking}", encodeURIComponent(t));
}

// Cash receipt number: human, sortable, unique per order. CRN-20261007-123.
export function receiptNo(orderId: number, at = ""): string {
  const day = (at || new Date().toISOString()).slice(0, 10).replaceAll("-", "");
  return `CRN-${day}-${Math.max(0, Math.round(orderId))}`;
}

// Idempotency keys for offline replay + double-tap protection.
export function newIkey(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 24);
}

export function renderMessage(template: string, vars: Record<string, string>): string {
  let out = template.slice(0, 1000);
  for (const [k, v] of Object.entries(vars)) out = out.split(`{{${k}}}`).join(v.slice(0, 200));
  return out;
}
