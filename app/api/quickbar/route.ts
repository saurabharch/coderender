import { NextResponse } from "next/server";
import { QUICKBAR_ACTIONS, resolveQuickbar } from "@/lib/quickbar";
import { sessionUser } from "@/lib/auth";

// Staff quick-bar resolver: catalog + role defaults, overridden per role by
// the dashboard pref saved in Settings → Quick bar. Scan is always central.
export async function GET() {
  const u = await sessionUser();
  if (!u) return NextResponse.json({ error: "login required" }, { status: 401 });
  const ids = resolveQuickbar(u.role);
  return NextResponse.json({
    role: u.role,
    items: ids.map((id) => QUICKBAR_ACTIONS.find((a) => a.id === id)!),
  });
}
