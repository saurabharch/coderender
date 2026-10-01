import { createHmac, randomBytes, randomInt } from "node:crypto";
import { getDb, getPref } from "./store";
import { TTL_MS, offsetOk, powOk } from "./slider-core";

export type CaptchaProvider = "default" | "slider" | "off";

// Single source of truth — both gates can never be active at once.
export function activeProvider(): CaptchaProvider {
  const p = getPref("captcha_provider", "default");
  return p === "slider" || p === "off" ? p : "default";
}

const SECRET = process.env.CAPTCHA_SECRET || "coderender-dev-captcha-secret-change-me";

function table() {
  getDb().exec(`CREATE TABLE IF NOT EXISTS SliderCaptcha (
    id TEXT PRIMARY KEY, x REAL NOT NULL, exp INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0)`);
}

function sign(id: string): string {
  return createHmac("sha256", SECRET).update(`slider:${id}`).digest("hex").slice(0, 24);
}

function pickBackground(): string {
  try {
    const rows = getDb().prepare(
      "SELECT filename, url FROM MediaAsset WHERE mime LIKE 'image/%' ORDER BY id DESC LIMIT 20").all() as
      { filename: string; url: string }[];
    const urls = rows.map((r) => r.url || (r.filename ? `/uploads/${r.filename}` : "")).filter(Boolean);
    if (urls.length) return urls[randomInt(0, urls.length)];
  } catch { /* fall through to gradient */ }
  return `gradient:${randomInt(1, 6)}`;
}

export function newSliderChallenge(): { id: string; sig: string; bg: string; zeros: number; expiresIn: number } {
  table();
  const id = `${Date.now().toString(36)}${randomBytes(4).toString("hex")}`;
  const x = 0.15 + Math.random() * 0.7;
  getDb().prepare("INSERT INTO SliderCaptcha (id, x, exp) VALUES (?,?,?)").run(id, x, Date.now() + TTL_MS);
  getDb().prepare("DELETE FROM SliderCaptcha WHERE exp < ?").run(Date.now());
  return { id, sig: sign(id), bg: pickBackground(), zeros: 2, expiresIn: Math.round(TTL_MS / 1000) };
}

export function verifySlider(id: string, sig: string, dx: number, nonce: string): boolean {
  table();
  if (sign(String(id)) !== String(sig)) return false;
  const row = getDb().prepare("SELECT x, exp, used FROM SliderCaptcha WHERE id=?").get(id) as
    { x: number; exp: number; used: number } | undefined;
  getDb().prepare("DELETE FROM SliderCaptcha WHERE id=?").run(id);
  if (!row || row.used || Date.now() > row.exp) return false;
  return offsetOk(row.x, Number(dx)) && powOk(String(id), String(nonce));
}
