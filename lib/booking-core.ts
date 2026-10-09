// Pure booking interval math (no sqlite — safe for vitest). Half-open
// semantics everywhere: [start, end) — a checkout at 11:00 and the next
// check-in at 11:00 do NOT conflict. Buffers (cleanup/setup) expand both
// sides before comparison.

export interface Interval {
  start: string;
  end: string;
}

function ms(iso: string): number | null {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

/** Do two half-open intervals overlap? Invalid ranges never overlap. */
export function overlaps(a: Interval, b: Interval): boolean {
  const a0 = ms(a.start);
  const a1 = ms(a.end);
  const b0 = ms(b.start);
  const b1 = ms(b.end);
  if (a0 === null || a1 === null || b0 === null || b1 === null) return false;
  if (!(a0 < a1) || !(b0 < b1)) return false;
  return a0 < b1 && b0 < a1;
}

/** Expand an interval by buffer minutes on both sides. */
export function withBuffer(iv: Interval, bufferMin: number): Interval {
  const buf = Math.max(0, Math.round(bufferMin) || 0) * 60000;
  const a0 = ms(iv.start);
  const a1 = ms(iv.end);
  if (a0 === null || a1 === null) return iv;
  return {
    start: new Date(a0 - buf).toISOString(),
    end: new Date(a1 + buf).toISOString(),
  };
}

/** First existing booking conflicting with the candidate, or null. */
export function findConflict(
  existing: Interval[], start: string, end: string, bufferMin = 0,
): Interval | null {
  const cand = withBuffer({ start, end }, bufferMin);
  // Candidate itself must be a valid range.
  const c0 = ms(cand.start);
  const c1 = ms(cand.end);
  if (c0 === null || c1 === null || !(c0 < c1)) return { start, end };
  for (const e of existing) {
    if (overlaps(cand, withBuffer(e, 0))) return e;
  }
  return null;
}
