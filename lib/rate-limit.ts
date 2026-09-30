const HITS = new Map<string, number[]>();

export function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (HITS.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) return true;
  arr.push(now);
  HITS.set(key, arr);
  return false;
}

export function slowDown() {
  return { error: "slow down — try again in a bit" };
}

// Best-effort client key: fingerprint + first forwarded IP (either alone is
// rotatable/spoofable; combined raises the bar. Single-process map resets on
// restart — accepted for one pm2 fork; use Redis when horizontally scaled).
export function clientKey(fp: string | undefined, req: Request): string {
  const ip = (req.headers.get("x-forwarded-for") || "anon").split(",")[0].trim();
  return `${fp || "nofp"}|${ip}`;
}
