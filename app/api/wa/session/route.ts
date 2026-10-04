import { NextResponse } from "next/server";
import { z } from "zod";
import { wahaLogout, wahaQR, wahaStart } from "@/lib/waha";
import { sessionUser } from "@/lib/auth";

export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await wahaQR()) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "waha unreachable" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({ action: z.enum(["start", "logout"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad action" }, { status: 422 });
  try {
    if (parsed.data.action === "start") await wahaStart();
    else await wahaLogout();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "waha unreachable" }, { status: 502 });
  }
}
