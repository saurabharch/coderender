// Pure time-ago helper (no deps — safe everywhere).
export function timeAgo(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

// Countdown to a due datetime: "2d left", "3h left", "overdue 1d".
// Day-granular (calendar days) so timezones never wobble the count.
export function dueIn(dueAt: string, now = Date.now()): string {
  const t = new Date(dueAt).getTime();
  if (!Number.isFinite(t)) return "";
  const day = (ms: number) => {
    const d = new Date(ms);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  };
  const dd = Math.round((day(t) - day(now)) / 864e5);
  if (dd >= 2) return `${dd}d left`;
  if (dd <= -1) return `overdue ${-dd}d`;
  const h = Math.floor(Math.abs(t - now) / 36e5);
  const label = h >= 1 ? `${h}h` : `${Math.max(1, Math.floor(Math.abs(t - now) / 6e4))}m`;
  return t >= now ? `${label} left` : `overdue ${label}`;
}
