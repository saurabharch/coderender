// Pure receivables math (no sqlite — safe for vitest). Terms + overdue status
// from the balance age; buckets need invoice allocation (deferred).

export interface AgeInput {
  balance: number;
  balanceSince: string;
  termsDays: number;
}

export interface AgeStatus {
  days: number;
  overdue: boolean;
  label: string;
}

/** Days a balance has stood + whether it breached terms. Empty age = 0 days. */
export function ageStatus(input: AgeInput, now = new Date()): AgeStatus {
  const terms = Math.max(0, Math.round(input.termsDays) || 0);
  const since = Date.parse(input.balanceSince || "");
  const days = Number.isFinite(since)
    ? Math.max(0, Math.floor((now.getTime() - since) / 86400000))
    : 0;
  const overdue = input.balance > 0 && days > terms;
  const label = input.balance <= 0
    ? "settled"
    : overdue
      ? `overdue ${days - terms}d`
      : terms > 0
        ? `due in ${terms - days}d`
        : "due";
  return { days, overdue, label };
}

/** Clamp payment terms to a sane range (0 = due on sale, max 1 year). */
export function parseTermsDays(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.min(365, Math.max(0, n));
}

// Reminder copy: firm, warm, exact amount + overdue age. Pure for tests.
export function udhariReminderText(name: string, balancePaise: number, daysOverdue: number): string {
  const who = name.trim() || "friend";
  return `Namaste ${who}, a friendly reminder: ₹${(Math.max(0, balancePaise) / 100).toFixed(0)} has been due for ${Math.max(0, daysOverdue)} day(s). Please pay at the counter or via UPI. — CodeRender`;
}
