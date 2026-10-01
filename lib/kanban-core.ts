// Pure kanban helpers (no sqlite import — safe for vitest).

export const PRIORITIES = [
  { id: "low", label: "Low", badge: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300" },
  { id: "medium", label: "Medium", badge: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300" },
  { id: "high", label: "High", badge: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
  { id: "urgent", label: "Urgent", badge: "bg-red-500/15 text-red-700 dark:text-red-300" },
] as const;

export type PriorityId = (typeof PRIORITIES)[number]["id"];

export function isPriority(p: unknown): p is PriorityId {
  return PRIORITIES.some((x) => x.id === p);
}

export function priorityBadge(p: string): string {
  return PRIORITIES.find((x) => x.id === p)?.badge ?? PRIORITIES[1].badge;
}

// Renumber ordinals 0..n after any move/reorder so order stays gapless.
export function normalizeOrder(ids: number[]): Record<number, number> {
  const out: Record<number, number> = {};
  ids.forEach((id, i) => { out[id] = i; });
  return out;
}

export interface AnalyticsInput {
  columns: { id: number; name: string }[];
  tasks: { columnId: number; priority: string; createdAt: string; doneAt: string; archived: number }[];
  moves: { day: string; n: number }[];
}

export interface BoardAnalytics {
  total: number;
  perColumn: { name: string; n: number }[];
  perPriority: { priority: string; n: number }[];
  done7d: number;
  done30d: number;
  avgCycleDays: number;
  throughput: { day: string; n: number }[];
}

export function boardAnalytics(input: AnalyticsInput, now = Date.now()): BoardAnalytics {
  const live = input.tasks.filter((t) => !t.archived);
  const perColumn = input.columns.map((c) => ({
    name: c.name, n: live.filter((t) => t.columnId === c.id).length,
  }));
  const perPriority = (["urgent", "high", "medium", "low"] as const).map((p) => ({
    priority: p, n: live.filter((t) => t.priority === p).length,
  }));
  const done = input.tasks.filter((t) => t.doneAt);
  const inDays = (d: number) => done.filter((t) => now - new Date(t.doneAt).getTime() < d * 864e5).length;
  const cycles = done
    .map((t) => (new Date(t.doneAt).getTime() - new Date(t.createdAt).getTime()) / 864e5)
    .filter((x) => Number.isFinite(x) && x >= 0);
  return {
    total: live.length,
    perColumn,
    perPriority,
    done7d: inDays(7),
    done30d: inDays(30),
    avgCycleDays: cycles.length ? Math.round((cycles.reduce((a, b) => a + b, 0) / cycles.length) * 10) / 10 : 0,
    throughput: input.moves,
  };
}
