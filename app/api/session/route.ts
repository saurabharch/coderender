import { NextResponse } from "next/server";
import { sessionUser } from "@/lib/auth";

// Session identity for client chrome (role-aware quick bar, guards).
export async function GET() {
  const u = await sessionUser();
  if (!u) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { email: u.email, role: u.role } });
}
