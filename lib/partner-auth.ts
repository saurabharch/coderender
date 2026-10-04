import { createHmac } from "node:crypto";
import { cookies } from "next/headers";

const SECRET = process.env.CAPTCHA_SECRET || "coderender-dev-captcha-secret-change-me";

// PIN-gated partner sessions (separate from team magic-link sessions).
export function partnerCookie(email: string): string {
  const exp = Date.now() + 7 * 864e5;
  const sig = createHmac("sha256", SECRET).update(`partner:${email}:${exp}`).digest("hex").slice(0, 32);
  return `${email}|${exp}|${sig}`;
}

export async function partnerSession(): Promise<string | null> {
  const jar = await cookies();
  const v = jar.get("cr_partner")?.value;
  if (!v) return null;
  const [email, exp, sig] = v.split("|");
  if (!email || !exp || !sig || Date.now() > Number(exp)) return null;
  const want = createHmac("sha256", SECRET).update(`partner:${email}:${exp}`).digest("hex").slice(0, 32);
  return sig === want ? email.toLowerCase() : null;
}
