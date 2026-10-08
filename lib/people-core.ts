// Pure people + planning math (no sqlite — safe for vitest).

export interface PayBits { base: number; allowances: number; deductions: number; loanCut: number; bonus?: number }

// Net pay, floored at zero (deductions can never make it negative).
export function netPay(p: PayBits): number {
  return Math.max(0, Math.round(p.base + p.allowances + (p.bonus ?? 0) - p.deductions - p.loanCut));
}

// Loan installment: min(agreed, remaining).
export function loanCut(balance: number, installment: number): number {
  return Math.min(Math.max(0, balance), Math.max(0, installment));
}

// Attendance summary from day-marks.
export function attendanceSummary(marks: string[]): { present: number; absent: number; leave: number; rate: number } {
  let present = 0, absent = 0, leave = 0;
  for (const m of marks) {
    if (m === "present" || m === "half") present += m === "half" ? 0.5 : 1;
    else if (m === "leave") leave++;
    else absent++;
  }
  const total = present + absent + leave;
  return { present, absent, leave, rate: total ? Math.round((present / total) * 100) : 0 };
}

// Moving-average forecast of the next period from past totals.
export function forecastNext(past: number[], periods = 1): number {
  if (!past.length) return 0;
  const avg = past.reduce((s, v) => s + v, 0) / past.length;
  return Math.round(avg * Math.max(1, periods));
}

// Margin pct on revenue (negative when losing money — shown honestly).
export function marginPct(revenue: number, cost: number): number {
  if (revenue <= 0) return 0;
  return Math.round(((revenue - cost) / revenue) * 100);
}
