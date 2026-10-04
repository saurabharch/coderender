import { NextResponse } from "next/server";
import { z } from "zod";
import { issueOtp, verifyOtp, verifiedCookie, hasGatePass, mintGatePass, checkGatePass, otpLocked } from "@/lib/otp";
import { rateLimited, slowDown, clientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (rateLimited(`${clientKey(undefined, req)}|otp`, 20, 600_000))
    return NextResponse.json(slowDown(), { status: 429 });
  const body = await req.json().catch(() => null);
  const parsed = z.object({
    email: z.string().email().max(120),
    code: z.string().max(10).optional(),
    pin: z.string().max(6).optional(),
  }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 422 });
  const email = parsed.data.email.toLowerCase();

  // PIN path: returning users with a gate pass skip email OTP.
  if (parsed.data.pin) {
    if (otpLocked(email, "pin"))
      return NextResponse.json({ error: "too many wrong tries — locked, try again later" }, { status: 429 });
    if (!checkGatePass(email, parsed.data.pin))
      return NextResponse.json({ error: "wrong PIN" }, { status: 403 });
    const res = NextResponse.json({ ok: true, via: "pin" });
    res.cookies.set("cr_verified", verifiedCookie(email), {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86400,
    });
    return res;
  }

  // OTP request (no code yet): same code until expiry.
  if (!parsed.data.code) {
    if (otpLocked(email, "otp"))
      return NextResponse.json({ error: "too many wrong tries — locked, try again later" }, { status: 429 });
    try {
      const { devCode } = await issueOtp(email);
      return NextResponse.json({ ok: true, hasPin: hasGatePass(email), devCode });
    } catch {
      return NextResponse.json({ error: "too many wrong tries — locked, try again later" }, { status: 429 });
    }
  }

  // OTP verify → cookie + mint gate pass on first success (shown once).
  if (otpLocked(email, "otp"))
    return NextResponse.json({ error: "too many wrong tries — locked, try again later" }, { status: 429 });
  if (!verifyOtp(email, parsed.data.code))
    return NextResponse.json({ error: "wrong or expired code" }, { status: 403 });
  let gatePin: string | undefined;
  if (!hasGatePass(email)) gatePin = mintGatePass(email).pin;
  const res = NextResponse.json({ ok: true, via: "otp", gatePin });
  res.cookies.set("cr_verified", verifiedCookie(email), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86400,
  });
  return res;
}
