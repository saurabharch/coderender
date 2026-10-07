import { NextResponse } from "next/server";
import { QUICKBAR_ACTIONS, resolveQuickbar, scanMode } from "@/lib/quickbar";
import { sessionUser } from "@/lib/auth";

// Staff quick-bar resolver: catalog + role defaults, overridden per role by
// the dashboard pref saved in Settings → Quick bar. Scan is always central;
// scanMode tells the bar what a scan means for this role.
export async function GET() {
  const u = await sessionUser();
  if (!u) return NextResponse.json({ error: "login required" }, { status: 401 });
  const ids = resolveQuickbar(u.role);
  return NextResponse.json({
    role: u.role,
    scanMode: scanMode(u.role),
    items: ids.map((id) => QUICKBAR_ACTIONS.find((a) => a.id === id)!),
  });
}
