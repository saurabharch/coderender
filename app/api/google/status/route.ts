import { NextResponse } from "next/server";
import { googleStatus, recentDocs } from "@/lib/google";
import { sessionUser } from "@/lib/auth";

export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  return NextResponse.json({ ...googleStatus(user.email), recent: recentDocs(user.email) });
}
