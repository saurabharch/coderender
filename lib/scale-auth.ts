import { NextResponse } from "next/server";
import { requireScope, verifyApiKey } from "@/lib/api-auth";
import { sessionUser } from "@/lib/auth";
import { roleGate } from "@/lib/scale";
import type { Perm } from "@/lib/scale-core";

// Scale gate: team session checked against the RBAC matrix; services pass an
// `admin` key, or `shop:write` only where explicitly allowed (order ingest).
export async function scaleGate(req: Request, perm: Perm, allowShopWrite = false): Promise<{ actor: string } | NextResponse> {
  const user = await sessionUser();
  if (user) {
    const deny = roleGate(user.role, perm);
    if (deny) return NextResponse.json({ error: deny }, { status: 403 });
    return { actor: user.email };
  }
  const ident = verifyApiKey(req.headers.get("authorization") ?? req.headers.get("x-api-key"));
  if (!ident) return NextResponse.json({ error: "login or api key required" }, { status: 401 });
  if (requireScope(ident, "admin")) return { actor: `key:${ident.name}` };
  if (allowShopWrite && requireScope(ident, "shop:write")) return { actor: `key:${ident.name}` };
  return NextResponse.json({ error: "scope denied", need: "admin" }, { status: 403 });
}
