// Pure calendar math (no sqlite — safe for vitest). All days are YYYY-MM-DD.

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseDay(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s ?? ""));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function addDays(day: string, n: number): string {
  const d = parseDay(day);
  if (!d) return day;
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

// 6x7 month grid (Monday-first), null for padding cells.
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month - 1, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  while (cells.length < 42) cells.push(null);
  return cells;
}

export interface CalTask {
  id: number; title: string; startAt: string; dueAt: string; doneAt: string;
  priority: string; assigneeEmail: string; designation?: string;
}

// Day a task belongs to: due date preferred, else done date, else created day.
export function taskDay(t: { dueAt: string; doneAt: string; createdAt: string }): string {
  const due = parseDay(t.dueAt);
  if (due) return dayKey(due);
  if (t.doneAt) {
    const d = new Date(t.doneAt);
    if (!Number.isNaN(d.getTime())) return dayKey(d);
  }
  const c = new Date(t.createdAt);
  if (!Number.isNaN(c.getTime())) return dayKey(c);
  return dayKey(new Date());
}

export function groupByDay(tasks: CalTask[]): Record<string, CalTask[]> {
  const out: Record<string, CalTask[]> = {};
  for (const t of tasks) {
    const k = taskDay({ dueAt: t.dueAt, doneAt: t.doneAt, createdAt: "" });
    (out[k] ??= []).push(t);
  }
  return out;
}

// Gantt bar: percent offsets across [from, to] range (clamped).
export function barSpan(startAt: string, dueAt: string, from: string, to: string): { left: number; width: number } {
  const f = parseDay(from)?.getTime() ?? 0;
  const t = (parseDay(to)?.getTime() ?? 0) + 864e5;
  const s = Math.max(parseDay(startAt)?.getTime() ?? f, f);
  const e = Math.min((parseDay(dueAt)?.getTime() ?? t - 864e5) + 864e5, t);
  const span = Math.max(t - f, 864e5);
  return {
    left: Math.max(0, Math.min(100, ((s - f) / span) * 100)),
    width: Math.max(2, Math.min(100, ((Math.max(e, s + 864e5) - s) / span) * 100)),
  };
}

// Unique sync identity: one key per task per day — idempotent across retries.
export function syncKey(taskId: number, day: string): string {
  return `cr-task-${taskId}-${day}`;
}
