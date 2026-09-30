import { NextResponse } from "next/server";
import { sessionUser } from "@/lib/auth";
import { emit } from "@/lib/events";

export async function POST() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  await emit("app/ops.cancel", { by: user.email });
  return NextResponse.json({ ok: true, note: "cancel signal fanned out; broadcast runs stop at next step" });
}
