// Pure slider-captcha helpers (node:crypto only — safe for vitest).
import { createHash } from "node:crypto";

export const TOLERANCE = 0.045; // max |dx - x| on a 0..1 track
export const POW_ZEROS = 2; // leading-zero difficulty (fast on phones)
export const TTL_MS = 5 * 60 * 1000;

// Hashcash check: sha256(`${id}:${nonce}`) starts with POW_ZEROS zeros.
export function powOk(id: string, nonce: string): boolean {
  if (!/^[a-z0-9]{1,32}$/i.test(nonce)) return false;
  const h = createHash("sha256").update(`${id}:${nonce}`).digest("hex");
  return h.startsWith("0".repeat(POW_ZEROS));
}

// Constant-time-ish offset check on normalized 0..1 positions.
export function offsetOk(x: number, dx: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(dx)) return false;
  return Math.abs(x - dx) <= TOLERANCE + 1e-9;
}
