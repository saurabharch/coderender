import { NextResponse } from "next/server";
import { searchUsers } from "@/lib/kanban";
import { sessionUser } from "@/lib/auth";

// Assignee picker source: team AppUsers (identity-scoped directory).
export async function GET(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json({ users: searchUsers(q) });
}
