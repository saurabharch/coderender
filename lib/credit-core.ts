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

export interface SliceState { id: number; dueAt: string; amount: number; paid: number }
export interface SliceHit { id: number; amount: number }

// Oldest-first allocation across open slices (by due date, then id).
// Never overpays a slice; leftover is returned, never lost.
export function allocateSlices(slices: SliceState[], payment: number): { applied: SliceHit[]; leftover: number } {
  let rest = Math.max(0, Math.round(payment) || 0);
  const applied: SliceHit[] = [];
  const open = [...slices]
    .map((s) => ({ ...s, due: Math.max(0, s.amount - s.paid) }))
    .filter((s) => s.due > 0)
    .sort((a, b) => (a.dueAt < b.dueAt ? -1 : a.dueAt > b.dueAt ? 1 : a.id - b.id));
  for (const s of open) {
    if (rest <= 0) break;
    const take = Math.min(s.due, rest);
    applied.push({ id: s.id, amount: take });
    rest -= take;
  }
  return { applied, leftover: rest };
}
