import { NextResponse } from "next/server";
import { getDb } from "@/lib/store";
import { parseSlotDay } from "@/lib/calendar-core";
import { sessionUser } from "@/lib/auth";

// Upcoming meetings with parsed day keys (best-effort from slot text).
export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const rows = getDb().prepare(
    "SELECT id, name, contact, mode, slot, status FROM Appointment WHERE status IN ('proposed','confirmed') ORDER BY id DESC LIMIT 100"
  ).all() as { id: number; name: string; contact: string; mode: string; slot: string; status: string }[];
  return NextResponse.json({
    meetings: rows.map((r) => ({ ...r, day: parseSlotDay(r.slot) })),
  });
}
