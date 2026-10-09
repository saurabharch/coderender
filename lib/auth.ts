import { cookies } from "next/headers";
import { createHmac } from "node:crypto";
import { getDb, getPref, uid } from "./store";
import { audit } from "./scale";

export const ADMIN_EMAILS = ["saurabhkashyap0001@gmail.com", "raj90.ro@gmail.com"];
const SESSION_DAYS = 30;

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

// Owner-managed invite list (Settings → Team): extra emails allowed to sign
// in. They land as member; the owner assigns a real role afterwards.
export function isInvited(email: string): boolean {
  try {
    const list = getPref("team_invites", "");
    return list.split(",").map((s) => s.trim().toLowerCase()).includes(email.trim().toLowerCase());
  } catch {
    return false;
  }
}

export function canSignIn(email: string): boolean {
  return isAdminEmail(email) || isInvited(email);
}

// Direct (dev-bypass) sign-in: usable only when the owner-enabled switch is
// on AND the address is a superadmin (allowlisted) address. Everyone else
// always goes through the mailed production link. Defaults: on outside
// production, off in production.
export function devBypassOn(): boolean {
  try {
    const raw = getPref("dev_bypass", process.env.NODE_ENV === "production" ? "off" : "on");
    return raw === "on";
  } catch {
    return process.env.NODE_ENV !== "production";
  }
}

export function upsertUser(email: string) {
  const d = getDb();
  const e = email.trim().toLowerCase();
  // Fresh teammates land least-privileged (staff); the owner upgrades them.
  d.prepare("INSERT INTO AppUser (email, role) VALUES (?, ?) ON CONFLICT(email) DO NOTHING")
    .run(e, isAdminEmail(e) ? "owner" : "staff");
  const id = (d.prepare("SELECT id FROM AppUser WHERE email=?").get(e) as { id: number }).id;
  d.prepare("INSERT INTO Membership (userId, orgId, role) VALUES (?,?,?) ON CONFLICT(userId, orgId) DO NOTHING")
    .run(id, 1, isAdminEmail(e) ? "owner" : "staff");
  return id;
}

export function issueMagicToken(email: string): string {
  const token = uid(24);
  const exp = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  getDb().prepare("INSERT INTO MagicToken (email, token, expiresAt) VALUES (?,?,?)").run(email.trim().toLowerCase(), token, exp);
  return token;
}

export function redeemMagicToken(token: string): number | null {
  const d = getDb();
  const row = d.prepare("SELECT * FROM MagicToken WHERE token=? AND used=0").get(token) as
    { id: number; email: string; expiresAt: string } | undefined;
  if (!row || new Date(row.expiresAt).getTime() < Date.now()) return null;
  d.prepare("UPDATE MagicToken SET used=1 WHERE id=?").run(row.id);
  const userId = upsertUser(row.email);
  const sess = uid(24);
  const exp = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  d.prepare("INSERT INTO Session (userId, token, expiresAt) VALUES (?,?,?)").run(userId, sess, exp);
  return userId;
}

export async function sessionUser(): Promise<{ id: number; email: string; role: string } | null> {
  const jar = await cookies();
  const token = jar.get("cr_session")?.value;
  if (!token) return null;
  const row = getDb().prepare(
    `SELECT u.id, u.email, u.role FROM Session s JOIN AppUser u ON u.id=s.userId
     WHERE s.token=? AND s.expiresAt > datetime('now')`).get(token) as
    { id: number; email: string; role: string } | undefined;
  return row ?? null;
}

export function newSessionToken(userId: number): { token: string; maxAge: number } {
  const token = uid(24);
  const exp = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  getDb().prepare("INSERT INTO Session (userId, token, expiresAt) VALUES (?,?,?)").run(userId, token, exp);
  return { token, maxAge: SESSION_DAYS * 86400 };
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get("cr_session")?.value;
  if (token) getDb().prepare("DELETE FROM Session WHERE token=?").run(token);
}

export async function requireTeam(): Promise<{ id: number; email: string; role: string }> {
  const user = await sessionUser();
  if (!user) throw new Error("login required");
  return user;
}

// Owner impersonation: cr_imp holds `<ownerSessionToken>.<sig>` (HMAC-signed).
// Lets /admin show a "viewing as" banner and Stop restore the owner session.
const IMP_SECRET = process.env.CAPTCHA_SECRET || "coderender-dev-captcha-secret-change-me";

function impSig(token: string): string {
  return createHmac("sha256", IMP_SECRET).update(`impersonate:${token}`).digest("hex").slice(0, 32);
}

export async function impersonator(): Promise<{ email: string; token: string } | null> {
  const jar = await cookies();
  const raw = jar.get("cr_imp")?.value;
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  if (i < 0) return null;
  const token = raw.slice(0, i);
  if (impSig(token) !== raw.slice(i + 1)) return null;
  const row = getDb().prepare(
    `SELECT u.email FROM Session s JOIN AppUser u ON u.id=s.userId
     WHERE s.token=? AND s.expiresAt > datetime('now')`).get(token) as { email: string } | undefined;
  if (!row) return null;
  return { email: row.email, token };
}

export function signImpersonation(ownerToken: string): string {
  return `${ownerToken}.${impSig(ownerToken)}`;
}

// Core impersonation (used by settings actions; owner-only enforced by callers).
// Returns cookies to set. Never nests, never self-targets, target must exist.
export function startImpersonation(ownerEmail: string, ownerToken: string, targetEmail: string): { session: string; imp: string; maxAge: number } {
  const target = targetEmail.trim().toLowerCase();
  if (!target || target === ownerEmail) throw new Error("bad target");
  const row = getDb().prepare("SELECT id, role FROM AppUser WHERE email=?").get(target) as
    { id: number; role: string } | undefined;
  if (!row) throw new Error("no such user");
  const token = uid(24);
  const exp = new Date(Date.now() + 8 * 3600_000).toISOString();
  getDb().prepare("INSERT INTO Session (userId, token, expiresAt) VALUES (?,?,?)").run(row.id, token, exp);
  try {
    audit(ownerEmail, "impersonate.start", target, `as ${row.role}`);
  } catch { /* audit never blocks */ }
  return { session: token, imp: signImpersonation(ownerToken), maxAge: 8 * 3600 };
}

export function stopImpersonation(curSession: string | undefined, ownerToken: string): void {
  if (impSig(ownerToken) === "") throw new Error("bad token");
  if (curSession) getDb().prepare("DELETE FROM Session WHERE token=?").run(curSession);
}
