// Pure webhook-signing helpers (no sqlite — safe for vitest).
import { createHmac, timingSafeEqual } from "node:crypto";

export function signPayload(secret: string, idemKey: string, ts: number, payload: string): string {
  return `v1,${createHmac("sha256", secret).update(`${idemKey}.${ts}.${payload}`).digest("hex")}`;
}

export function verifySignature(secret: string, header: string, idemKey: string, ts: number, payload: string): boolean {
  const m = /^v1,([a-f0-9]{64})$/.exec(header);
  if (!m) return false;
  if (Math.abs(Date.now() - ts) > 5 * 60 * 1000) return false;
  try {
    return timingSafeEqual(Buffer.from(signPayload(secret, idemKey, ts, payload)), Buffer.from(`v1,${m[1]}`));
  } catch {
    return false;
  }
}

