import { createHmac, randomBytes, randomInt } from "node:crypto";
import { getDb, getPref } from "./store";
import { TTL_MS, POW_COUNT, makeChallenge, offsetOk, powOk } from "./slider-core";

export type CaptchaProvider = "default" | "slider" | "off";

// Single source of truth — both gates can never be active at once.
export function activeProvider(): CaptchaProvider {
  const p = getPref("captcha_provider", "default");
  return p === "slider" || p === "off" ? p : "default";
}

const SECRET = process.env.CAPTCHA_SECRET || "coderender-dev-captcha-secret-change-me";

// Vendored devcaptcha backgrounds, served from our own /captcha-bg/.
export const BUNDLED_BG = [
  "/captcha-bg/alvan-nee-T-0EW-SEbsE-unsplash.jpg",
  "/captcha-bg/freddie-marriage-iYQC9xWMvw4-unsplash.jpg",
  "/captcha-bg/jeanie-de-klerk-UTVfyq6ZlBU-unsplash.jpg",
  "/captcha-bg/jonas-vincent-xulIYVIbYIc-unsplash.jpg",
  "/captcha-bg/krista-mangulsone-9gz3wfHr65U-unsplash.jpg",
  "/captcha-bg/ricky-kharawala-adK3Vu70DEQ-unsplash.jpg",
  "/captcha-bg/shannon-richards-jx_kpR7cvDc-unsplash.jpg",
];

function table() {
  getDb().exec(`CREATE TABLE IF NOT EXISTS SliderCaptcha (
    id TEXT PRIMARY KEY, x REAL NOT NULL, exp INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0,
    challenges TEXT NOT NULL DEFAULT '[]', bg TEXT NOT NULL DEFAULT '')`);
  try { getDb().exec("ALTER TABLE SliderCaptcha ADD COLUMN challenges TEXT NOT NULL DEFAULT '[]'"); } catch { /* exists */ }
  try { getDb().exec("ALTER TABLE SliderCaptcha ADD COLUMN bg TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
}

function sign(id: string): string {
  return createHmac("sha256", SECRET).update(`slider:${id}`).digest("hex").slice(0, 24);
}

export function pickBackground(): string {
  try {
    // Owner uploads in the `puzzle` folder win; then the vendored set.
    const rows = getDb().prepare(
      "SELECT filename, url FROM MediaAsset WHERE mime LIKE 'image/%' AND folder='puzzle' ORDER BY id DESC LIMIT 20").all() as
      { filename: string; url: string }[];
    const urls = rows.map((r) => r.url || (r.filename ? `/uploads/${r.filename}` : "")).filter(Boolean);
    if (urls.length) return urls[randomInt(0, urls.length)];
  } catch { /* fall through */ }
  return BUNDLED_BG[randomInt(0, BUNDLED_BG.length)];
}

export interface SliderIssued {
  id: string; sig: string; bg: string;
  challenges: string[]; zeros: number; expiresIn: number;
  hx: number;
}

export function newSliderChallenge(): SliderIssued {
  table();
  const id = `${Date.now().toString(36)}${randomBytes(4).toString("hex")}`;
  const x = 0.15 + Math.random() * 0.7;
  const challenges = Array.from({ length: POW_COUNT }, makeChallenge);
  const bg = pickBackground();
  getDb().prepare("INSERT INTO SliderCaptcha (id, x, exp, challenges, bg) VALUES (?,?,?,?,?)").run(
    id, x, Date.now() + TTL_MS, JSON.stringify(challenges), bg);
  getDb().prepare("DELETE FROM SliderCaptcha WHERE exp < ?").run(Date.now());
  return { id, sig: sign(id), bg, challenges, zeros: 3, expiresIn: Math.round(TTL_MS / 1000), hx: Math.round(x * 1000) / 1000 };
}

export interface PowAnswer { challenge: string; prefix: number }

export function verifySlider(id: string, sig: string, dx: number, answers: PowAnswer[]): boolean {
  table();
  if (sign(String(id)) !== String(sig)) return false;
  const row = getDb().prepare("SELECT x, exp, used, challenges FROM SliderCaptcha WHERE id=?").get(id) as
    { x: number; exp: number; used: number; challenges: string } | undefined;
  getDb().prepare("DELETE FROM SliderCaptcha WHERE id=?").run(id);
  if (!row || row.used || Date.now() > row.exp) return false;
  if (!offsetOk(row.x, Number(dx))) return false;
  let expected: string[] = [];
  try {
    expected = JSON.parse(row.challenges || "[]");
  } catch { return false; }
  if (!Array.isArray(answers) || answers.length !== expected.length || expected.length === 0) return false;
  const got = answers.map((a) => String(a.challenge));
  for (const c of expected) {
    if (!got.includes(c)) return false;
  }
  for (const a of answers) {
    if (!powOk(String(a.prefix), String(a.challenge))) return false;
  }
  return true;
}
