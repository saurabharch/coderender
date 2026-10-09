import { NextResponse } from "next/server";
import { appBase, destroySession } from "@/lib/auth";

export async function POST(req: Request) {
  await destroySession();
  const res = NextResponse.redirect(new URL("/login", appBase(req.url)), 303);
  res.cookies.delete("cr_session");
  return res;
}
