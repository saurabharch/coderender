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

// Local-access check for the dev-bypass gate: localhost, loopback, and
// private LAN ranges (same-WiFi phone on the Termux host). Anything else —
// including the public tunnel hostname — is production, where usable login
// links must never leave the server.
export function isLocalHost(host: string | null): boolean {
  const h = (host || "").split(":")[0].trim().toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  const m = /^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(h);
  if (m) {
    const n = Number(m[1]);
    if (n >= 16 && n <= 31) return true;
  }
  return false;
}
