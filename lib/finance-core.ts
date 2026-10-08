// Pure finance math (no sqlite — safe for vitest). Event → journal legs and
// trial-balance arithmetic. The sqlite-backed writers in ./finance delegate
// here so the rules are unit-tested; storage stays untouched.

export type EntryKind = "invoice" | "payment" | "commission" | "payout" | "refund" | "adjust";

const LEGS: Record<EntryKind, [debit: string, credit: string]> = {
  invoice: ["receivable", "revenue"],
  payment: ["cash", "receivable"],
  commission: ["commission-expense", "partner-payable"],
  payout: ["partner-payable", "cash"],
  refund: ["revenue", "cash"],
  adjust: ["suspense", "suspense"],
};

/** Balanced debit/credit legs for an event kind (unknown kinds → suspense). */
export function legsFor(kind: string): [string, string] {
  return (LEGS as Record<string, [string, string]>)[kind] ?? ["suspense", "suspense"];
}

export interface TrialRow {
  account: string;
  debit: number;
  credit: number;
}

/** Net journal rows into per-account debit/credit totals (sorted). */
export function sumTrial(rows: { debit: string; credit: string; amount: number }[]): TrialRow[] {
  const map = new Map<string, { debit: number; credit: number }>();
  for (const r of rows) {
    const amt = Math.round(r.amount) || 0;
    const d = map.get(r.debit) ?? { debit: 0, credit: 0 };
    d.debit += amt;
    map.set(r.debit, d);
    const c = map.get(r.credit) ?? { debit: 0, credit: 0 };
    c.credit += amt;
    map.set(r.credit, c);
  }
  return [...map.entries()]
    .map(([account, v]) => ({ account, ...v }))
    .sort((a, b) => a.account.localeCompare(b.account));
}

/** A leger balances when total debits equal total credits. */
export function booksBalance(rows: TrialRow[]): { balanced: boolean; debit: number; credit: number } {
  const debit = rows.reduce((s, r) => s + r.debit, 0);
  const credit = rows.reduce((s, r) => s + r.credit, 0);
  return { balanced: debit === credit, debit, credit };
}
