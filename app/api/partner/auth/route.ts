import { NextResponse } from "next/server";
import { z } from "zod";
import { checkGatePass, hasGatePass, mintGatePass } from "@/lib/otp";
import { createPartner, partnerByEmail } from "@/lib/partners";
import { partnerCookie } from "@/lib/partner-auth";
import { rateLimited, slowDown, clientKey } from "@/lib/rate-limit";

function cookie(email: string) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("cr_partner", partnerCookie(email), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 7 * 86400,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

// POST {email} → join (creates partner + mints PIN, shown once)
// POST {email, pin} → login (sets cr_partner cookie)
export async function POST(req: Request) {
  if (rateLimited(`${clientKey(undefined, req)}|partner-auth`, 10, 3600_000))
    return NextResponse.json(slowDown(), { status: 429 });
  const parsed = z.object({ email: z.string().email().max(120), pin: z.string().max(10).optional(), name: z.string().max(80).optional() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 422 });
  const { email, pin, name } = parsed.data;
  let partner = partnerByEmail(email);
  if (!partner) {
    const id = createPartner({ email, name });
    partner = partnerByEmail(email);
    void id;
  }
  if (pin) {
    if (!checkGatePass(email, pin)) return NextResponse.json({ error: "wrong PIN" }, { status: 403 });
    return cookie(email);
  }
  if (hasGatePass(email)) return NextResponse.json({ ok: true, hasPin: true });
  const { pin: fresh } = mintGatePass(email);
  return NextResponse.json({ ok: true, pin: fresh });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("cr_partner");
  return res;
}
