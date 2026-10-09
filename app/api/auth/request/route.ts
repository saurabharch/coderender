import { NextResponse } from "next/server";
import { z } from "zod";
import { canSignIn, devBypassOn, isAdminEmail, issueMagicToken } from "@/lib/auth";
import { sendMail, magicLinkMail } from "@/lib/mailer";
import { rateLimited, slowDown, clientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (rateLimited(`${clientKey(undefined, req)}|auth-request`, 5, 600_000))
    return NextResponse.json(slowDown(), { status: 429 });
  const parsed = z.object({ email: z.string().email().max(120) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad email" }, { status: 422 });
  const email = parsed.data.email.toLowerCase();
  if (!canSignIn(email)) return NextResponse.json({ error: "not invited" }, { status: 403 });
  const token = issueMagicToken(email);
  const base = process.env.APP_URL ?? "http://localhost:3100";
  const link = `${base}/api/auth/verify?token=${token}`;
  const { preview } = await sendMail(email, "Your CodeRender sign-in link", magicLinkMail(link));
  // Usable login links must NEVER leave the server to the wrong hands:
  // the direct (dev-bypass) link is returned only when the owner-enabled
  // switch is on, mail cannot deliver, the address is a superadmin
  // (allowlisted admin/owner) address, AND the request itself arrives over
  // local access (localhost/loopback/LAN). The public hostname never gets
  // one — everyone there uses the mailed production link and lands on
  // their role's dashboard.
  const { isLocalHost } = await import("@/lib/rate-limit");
  const direct = devBypassOn() && !process.env.SMTP_URL && isAdminEmail(email)
    && isLocalHost(req.headers.get("host"));
  return NextResponse.json({
    ok: true,
    devLink: direct ? link : undefined,
    mailSent: !!process.env.SMTP_URL,
    preview,
  });
}
