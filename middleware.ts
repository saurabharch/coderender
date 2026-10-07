import { NextResponse } from "next/server";
import { API_VERSION } from "@/lib/api-version";

export function middleware() {
  const res = NextResponse.next();
  res.headers.set("x-api-version", String(API_VERSION));
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
