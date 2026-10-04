import { NextResponse } from "next/server";
import { driveList } from "@/lib/google";
import { sessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const url = new URL(req.url);
  try {
    const files = await driveList(user.email, url.searchParams.get("q") || "", Number(url.searchParams.get("limit") || 10));
    return NextResponse.json({ ok: true, files });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "drive failed" }, { status: 422 });
  }
}
