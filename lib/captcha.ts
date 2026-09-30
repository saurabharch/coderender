import { createHmac, randomInt } from "node:crypto";
import { getDb } from "./store";

const SECRET = process.env.CAPTCHA_SECRET || "coderender-dev-captcha-secret-change-me";
const TTL_MS = 10 * 60 * 1000;

function table() {
  getDb().exec(`CREATE TABLE IF NOT EXISTS Captcha (
    id TEXT PRIMARY KEY, answer INTEGER NOT NULL, exp INTEGER NOT NULL)`);
}

export function newChallenge(): { id: string; question: string } {
  table();
  const a = randomInt(2, 9);
  const b = randomInt(2, 9);
  const id = `${Date.now().toString(36)}${randomInt(1e6, 9e6).toString(36)}`;
  getDb().prepare("INSERT INTO Captcha (id, answer, exp) VALUES (?,?,?)").run(id, a + b, Date.now() + TTL_MS);
  getDb().prepare("DELETE FROM Captcha WHERE exp < ?").run(Date.now());
  return { id, question: `What is ${a} + ${b}?` };
}

export function verifyChallenge(id: string, answer: number): boolean {
  table();
  const row = getDb().prepare("SELECT answer, exp FROM Captcha WHERE id=?").get(id) as
    { answer: number; exp: number } | undefined;
  getDb().prepare("DELETE FROM Captcha WHERE id=?").run(id);
  if (!row || Date.now() > row.exp) return false;
  return row.answer === answer;
}

export function humanCookie(): string {
  return createHmac("sha256", SECRET).update("human-ok-v1").digest("hex").slice(0, 32);
}
