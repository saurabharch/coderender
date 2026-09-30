import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redeemMagicToken, newSessionToken } from "@/lib/auth";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const userId = redeemMagicToken(token);
  if (!userId) return NextResponse.redirect(new URL("/login?e=bad", req.url));
  const s = newSessionToken(userId);
  (await cookies()).set("cr_session", s.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: s.maxAge });
  return NextResponse.redirect(new URL("/admin", req.url));
}
