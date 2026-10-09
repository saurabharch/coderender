import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { appBase } from "@/lib/auth";
import { exchangeCode, setConnection } from "@/lib/gcal";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const [email] = state.split(":");
  const jar = await cookies();
  if (!email || !code || !jar.get("gcal_state")) {
    return NextResponse.redirect(new URL("/admin/google?gcal=bad", appBase(url.origin)));
  }
  try {
    const { refreshToken } = await exchangeCode(code);
    setConnection(email, { refreshToken });
    const res = NextResponse.redirect(new URL("/admin/google?gcal=ok", appBase(url.origin)));
    res.cookies.delete("gcal_state");
    return res;
  } catch {
    return NextResponse.redirect(new URL("/admin/google?gcal=fail", appBase(url.origin)));
  }
}
