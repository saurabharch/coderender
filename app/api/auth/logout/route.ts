import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST(req: Request) {
  await destroySession();
  const res = NextResponse.redirect(new URL("/login", req.url), 303);
  res.cookies.delete("cr_session");
  return res;
}
