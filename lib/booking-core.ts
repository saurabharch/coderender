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

export interface SeriesRule {
  startDate: string; // YYYY-MM-DD of first occurrence
  startTime: string; // HH:MM (24h)
  endTime: string; // HH:MM (24h)
  repeat: "weekly" | "monthly";
  weekdays?: number[]; // 0=Sun..6=Sat, weekly only
  until: string; // YYYY-MM-DD inclusive cap
}

export interface Occurrence { startAt: string; endAt: string }

const pad2 = (n: number): string => String(n).padStart(2, "0");
const dayIso = (t: number): string => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

// Expand a series into concrete half-open occurrences, capped. Day-by-day
// scan (max ~2 years) so weekly and monthly rules share one code path.
// Overnight spans (end <= start) roll past midnight. Invalid rules yield [].
export function expandSeries(rule: SeriesRule, cap = 52): Occurrence[] {
  const out: Occurrence[] = [];
  const limit = Math.min(52, Math.max(1, Math.round(cap) || 52));
  const t0 = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(rule.startTime || "");
  const t1 = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(rule.endTime || "");
  const first = Date.parse(`${rule.startDate}T00:00:00`);
  const last = Date.parse(`${rule.until}T00:00:00`);
  if (!t0 || !t1 || !Number.isFinite(first) || !Number.isFinite(last) || first > last) return out;
  const days = rule.repeat === "weekly"
    ? [...new Set((rule.weekdays ?? []).filter((d) => d >= 0 && d <= 6))].sort()
    : [];
  const monthDay = rule.startDate.slice(8);
  for (let cur = first; cur <= last && out.length < limit && cur - first < 731 * 86400000; cur += 86400000) {
    const iso = dayIso(cur);
    if (iso < rule.startDate) continue;
    const d = new Date(cur);
    const take = rule.repeat === "monthly"
      ? iso.slice(8) === monthDay
      : days.length === 0 || days.includes(d.getDay());
    if (!take) continue;
    const overnight = `${t1[1]}:${t1[2]}:00` <= `${t0[1]}:${t0[2]}:00`;
    const endIso = overnight ? dayIso(cur + 86400000) : iso;
    out.push({ startAt: `${iso}T${t0[1]}:${t0[2]}:00`, endAt: `${endIso}T${t1[1]}:${t1[2]}:00` });
  }
  return out;
}
