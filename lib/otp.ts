import { createHmac, randomInt } from "node:crypto";
import { getDb, hashKey } from "./store";
import { sendMail } from "./mailer";

const SECRET = process.env.CAPTCHA_SECRET || "coderender-dev-captcha-secret-change-me";
const OTP_TTL = 15 * 60 * 1000;

export function verifiedCookie(email: string): string {
  const e = email.trim().toLowerCase();
  const sig = createHmac("sha256", SECRET).update(`verified:${e}`).digest("hex").slice(0, 32);
  return `${e}.${sig}`;
}

export function checkVerifiedCookie(value: string | undefined): string | null {
  if (!value) return null;
  const i = value.lastIndexOf(".");
  if (i < 0) return null;
  const email = value.slice(0, i);
  if (!email.includes("@")) return null;
  return verifiedCookie(email) === value ? email : null;
}

// Same code until expiry — resends within the window return the identical code.
export async function issueOtp(email: string): Promise<{ devCode?: string }> {
  const e = email.trim().toLowerCase();
  const now = Date.now();
  const cur = getDb().prepare("SELECT code, exp FROM OtpCode WHERE email=?").get(e) as
    { code: string; exp: number } | undefined;
  let code: string;
  if (cur && cur.exp > now) {
    code = cur.code;
  } else {
    code = String(randomInt(100000, 999999));
    getDb().prepare("INSERT INTO OtpCode (email, code, exp) VALUES (?,?,?) ON CONFLICT(email) DO UPDATE SET code=excluded.code, exp=excluded.exp")
      .run(e, code, now + OTP_TTL);
  }
  if (!process.env.SMTP_URL) return { devCode: code };
  await sendMail(e, "Your CodeRender verification code",
    `<p>Your code is <b style="font-size:22px;letter-spacing:4px">${code}</b>. Valid 15 minutes. (WhatsApp delivery plugs in with a provider key.)</p>`);
  return {};
}

export function verifyOtp(email: string, code: string): boolean {
  const e = email.trim().toLowerCase();
  const row = getDb().prepare("SELECT code, exp FROM OtpCode WHERE email=?").get(e) as
    { code: string; exp: number } | undefined;
  if (!row || Date.now() > row.exp) return false;
  const ok = row.code === code.trim();
  if (ok) getDb().prepare("DELETE FROM OtpCode WHERE email=?").run(e);
  return ok;
}

// Never-expiring gate pass (4 or 6 digits), one per email, shown once at mint.
export function hasGatePass(email: string): boolean {
  const r = getDb().prepare("SELECT email FROM GatePass WHERE email=?").get(email.trim().toLowerCase());
  return !!r;
}

export function mintGatePass(email: string): { pin: string; digits: number } {
  const e = email.trim().toLowerCase();
  const digits = 6;
  const pin = String(randomInt(100000, 999999));
  getDb().prepare("INSERT INTO GatePass (email, pinHash, digits) VALUES (?,?,?) ON CONFLICT(email) DO NOTHING")
    .run(e, hashKey(`gatepass:${e}:${pin}`), digits);
  return { pin, digits };
}

export function checkGatePass(email: string, pin: string): boolean {
  const e = email.trim().toLowerCase();
  const p = pin.trim();
  if (!/^\d{4,6}$/.test(p)) return false;
  const r = getDb().prepare("SELECT pinHash FROM GatePass WHERE email=?").get(e) as { pinHash: string } | undefined;
  return !!r && r.pinHash === hashKey(`gatepass:${e}:${p}`);
}
