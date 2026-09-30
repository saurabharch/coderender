import { NextResponse } from "next/server";
import { z } from "zod";
import { newChallenge, verifyChallenge, humanCookie } from "@/lib/captcha";

export async function GET() {
  return NextResponse.json(newChallenge());
}

export async function POST(req: Request) {
  const parsed = z.object({ id: z.string().max(60), answer: z.coerce.number().int() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad captcha" }, { status: 422 });
  if (!verifyChallenge(parsed.data.id, parsed.data.answer))
    return NextResponse.json({ error: "wrong answer" }, { status: 403 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("cr_human", humanCookie(), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 6 * 3600,
  });
  return res;
}
