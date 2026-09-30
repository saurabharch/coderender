import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminEmail, issueMagicToken } from "@/lib/auth";
import { sendMail, magicLinkMail } from "@/lib/mailer";

export async function POST(req: Request) {
  const parsed = z.object({ email: z.string().email().max(120) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad email" }, { status: 422 });
  const email = parsed.data.email.toLowerCase();
  if (!isAdminEmail(email)) return NextResponse.json({ error: "not invited" }, { status: 403 });
  const token = issueMagicToken(email);
  const base = process.env.APP_URL ?? "http://localhost:3100";
  const link = `${base}/api/auth/verify?token=${token}`;
  const { preview } = await sendMail(email, "Your CodeRender sign-in link", magicLinkMail(link));
  // Dev convenience: return preview hint only when no real SMTP is configured
  return NextResponse.json({ ok: true, devLink: process.env.SMTP_URL ? undefined : link, preview });
}
