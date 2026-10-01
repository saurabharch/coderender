import { NextResponse } from "next/server";
import { boardStats, linkedSubmissions } from "@/lib/kanban";
import { sessionUser } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { id } = await params;
  return NextResponse.json({ stats: boardStats(Number(id)), linked: linkedSubmissions(Number(id), 10) });
}
