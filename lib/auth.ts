import { cookies } from "next/headers";
import { getDb, uid } from "./store";

export const ADMIN_EMAILS = ["saurabhkashyap0001@gmail.com", "raj90.ro@gmail.com"];
const SESSION_DAYS = 30;

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function upsertUser(email: string) {
  const d = getDb();
  const e = email.trim().toLowerCase();
  d.prepare("INSERT INTO AppUser (email, role) VALUES (?, ?) ON CONFLICT(email) DO NOTHING")
    .run(e, isAdminEmail(e) ? "owner" : "member");
  const id = (d.prepare("SELECT id FROM AppUser WHERE email=?").get(e) as { id: number }).id;
  d.prepare("INSERT INTO Membership (userId, orgId, role) VALUES (?,?,?) ON CONFLICT(userId, orgId) DO NOTHING")
    .run(id, 1, isAdminEmail(e) ? "owner" : "member");
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
