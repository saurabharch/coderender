import { NextResponse } from "next/server";
import { requireScope, verifyApiKey } from "@/lib/api-auth";
import { sessionUser } from "@/lib/auth";

// WooCommerce-style dual gate: team session always passes; services pass a
// `cr_` key with shop:read (GET) or shop:write (mutations). Returns null
// when authorized, else the 401/403 response to return.
export async function shopGate(req: Request, write: boolean) {
  const user = await sessionUser();
  if (user) return null;
  const ident = verifyApiKey(req.headers.get("authorization") ?? req.headers.get("x-api-key"));
  if (!ident) return NextResponse.json({ error: "login or api key required" }, { status: 401 });
  const need = write ? "shop:write" : "shop:read";
  if (!requireScope(ident, need)) return NextResponse.json({ error: "scope denied", need }, { status: 403 });
  return null;
}
