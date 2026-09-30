import { getDb, hashKey } from "./store";

export interface ApiIdentity {
  id: number;
  name: string;
  scopes: string[];
}

export function verifyApiKey(raw: string | null): ApiIdentity | null {
  if (!raw) return null;
  const token = raw.startsWith("Bearer ") ? raw.slice(7) : raw;
  if (!token.startsWith("cr_")) return null;
  const row = getDb().prepare("SELECT id, name, scopes FROM ApiKey WHERE hash=? AND active=1").get(hashKey(token)) as
    { id: number; name: string; scopes: string } | undefined;
  if (!row) return null;
  return { id: row.id, name: row.name, scopes: row.scopes.split(",").map((s) => s.trim()) };
}

export function requireScope(ident: ApiIdentity | null, scope: string): boolean {
  return !!ident && (ident.scopes.includes(scope) || ident.scopes.includes("admin"));
}
