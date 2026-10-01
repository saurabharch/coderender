// Pure slider-captcha helpers (node:crypto only — safe for vitest).
import { createHash, randomBytes } from "node:crypto";

export const TOLERANCE = 0.035; // max |dx - x| on a 0..1 track (~11px)
export const POW_ZEROS = 3; // leading-zero difficulty per challenge
export const POW_COUNT = 3; // challenges per captcha (reference batch model)
export const TTL_MS = 5 * 60 * 1000;

// One proof-of-work challenge string (server-issued, never reused).
export function makeChallenge(): string {
  return randomBytes(16).toString("hex");
}

// Hashcash check: sha256(`${prefix}${challenge}`) starts with POW_ZEROS zeros.
// NOTE: prefix comes FIRST (reference wire order), unlike the old `${id}:${nonce}`.
export function powOk(prefix: string, challenge: string): boolean {
  if (!/^[a-z0-9]{1,32}$/i.test(prefix) || !/^[a-f0-9]{32}$/.test(challenge)) return false;
  const h = createHash("sha256").update(`${prefix}${challenge}`).digest("hex");
  return h.startsWith("0".repeat(POW_ZEROS));
}

// Constant-time-ish offset check on normalized 0..1 positions.
export function offsetOk(x: number, dx: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(dx)) return false;
  return Math.abs(x - dx) <= TOLERANCE + 1e-9;
}
