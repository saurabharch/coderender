import { NextResponse } from "next/server";
import { z } from "zod";
import { activeProvider } from "@/lib/slider-captcha";
import { humanCookie } from "@/lib/captcha";
import { newSliderChallenge, verifySlider } from "@/lib/slider-captcha";

export async function GET() {
  if (activeProvider() !== "slider") return NextResponse.json({ error: "slider captcha off" }, { status: 404 });
  return NextResponse.json(newSliderChallenge());
}

export async function POST(req: Request) {
  if (activeProvider() !== "slider") return NextResponse.json({ error: "slider captcha off" }, { status: 404 });
  const parsed = z.object({
    id: z.string().max(60), sig: z.string().max(60),
    dx: z.number().min(0).max(1), nonce: z.string().max(32),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad solution" }, { status: 422 });
  const d = parsed.data;
  if (!verifySlider(d.id, d.sig, d.dx, d.nonce))
    return NextResponse.json({ error: "wrong position" }, { status: 403 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("cr_human", humanCookie(), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 6 * 3600,
  });
  return res;
}
