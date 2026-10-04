import { NextResponse } from "next/server";
import { partnerByCode } from "@/lib/partners";

// Affiliate link: /r/CRP-ABC123 → drops a 30-day attribution cookie.
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const p = partnerByCode(code);
  const res = NextResponse.redirect(new URL(`/?ref=${encodeURIComponent(p?.code ?? "")}`, req.url), { status: 307 });
  if (p) {
    res.cookies.set("cr_ref", p.code, {
      httpOnly: true, sameSite: "lax", path: "/", maxAge: 30 * 86400,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return res;
}
