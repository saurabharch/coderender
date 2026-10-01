// Pure queue math (no sqlite — safe for vitest).
export const MAX_ATTEMPTS = 5;

// Exponential backoff with jitter cap: 30s, 2m, 8m, 30m, 2h.
export function backoffMs(attempt: number): number {
  const steps = [30_000, 120_000, 480_000, 1_800_000, 7_200_000];
  return steps[Math.min(Math.max(attempt, 0), steps.length - 1)];
}

export function nextRunISO(fromMs: number, attempt: number): string {
  return new Date(fromMs + backoffMs(attempt)).toISOString().slice(0, 19).replace("T", " ");
}

export const JOB_KINDS = ["gcal.push", "gcal.pull", "agent.call", "notify"] as const;
export type JobKind = (typeof JOB_KINDS)[number];

export function isJobKind(k: unknown): k is JobKind {
  return (JOB_KINDS as readonly string[]).includes(String(k));
}
