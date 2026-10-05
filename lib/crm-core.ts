// Pure CRM + loyalty math (no sqlite — safe for vitest).

export const CRM_STAGES = [
  "lead", "prospect", "contacted", "qualified", "quotation",
  "negotiation", "customer", "repeat", "loyal",
] as const;

export type CrmStage = (typeof CRM_STAGES)[number];

const STAGE_IDX: Record<string, number> = Object.fromEntries(CRM_STAGES.map((s, i) => [s, i]));

// Pipeline only moves forward (or back to lead on loss); no skipping analyse→close chaos.
export function stageCan(from: string, to: string): boolean {
  const a = STAGE_IDX[from];
  const b = STAGE_IDX[to];
  if (a === undefined || b === undefined) return false;
  return b === a + 1 || b === a - 1 || (to === "lead" && a > b) || (from === "negotiation" && to === "customer");
}

export type Segment = "new" | "active" | "dormant" | "vip" | "lost";

// orders: {grand, at} newest last. vipSpend in paise, dormantDays threshold.
export function segmentOf(orders: { grand: number; at: string }[], now = Date.now(), vipSpend = 10000000, dormantDays = 90): Segment {
  if (!orders.length) return "new";
  const spend = orders.reduce((s, o) => s + o.grand, 0);
  if (spend >= vipSpend) return "vip";
  const last = Math.max(...orders.map((o) => new Date(o.at).getTime()));
  const days = (now - last) / 86400_000;
  if (days > dormantDays * 2) return "lost";
  if (days > dormantDays) return "dormant";
  return "active";
}

export function clv(orders: { grand: number }[]): number {
  return orders.reduce((s, o) => s + o.grand, 0);
}

// Loyalty: 1 point per `perRupee` rupees spent; 1 point = `paisePerPoint` off.
export function earnPoints(grandPaise: number, perRupee = 100): number {
  return Math.floor(grandPaise / 100 / Math.max(1, perRupee));
}

export function redeemValue(points: number, paisePerPoint = 25): number {
  return Math.max(0, Math.round(points)) * paisePerPoint;
}

export const TIERS = [
  { name: "silver", at: 0 }, { name: "gold", at: 500 }, { name: "platinum", at: 2000 },
];

export function tierFor(lifetimePoints: number): string {
  let t = TIERS[0].name;
  for (const tier of TIERS) if (lifetimePoints >= tier.at) t = tier.name;
  return t;
}
