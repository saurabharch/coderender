import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { connectStatus, connectUrl, gcalConfigured } from "@/lib/gcal";
import { sessionUser } from "@/lib/auth";

export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const st = connectStatus(user.email);
  if (!st.configured) return NextResponse.json({ ...st, note: "Add GOOGLE_CLIENT_ID/SECRET to enable Google sync." });
  const state = randomBytes(12).toString("hex");
  const jar = NextResponse.json({ url: connectUrl(user.email, state) });
  jar.cookies.set("gcal_state", createHash("sha256").update(state).digest("hex").slice(0, 32), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 600,
  });
  return jar;
}
