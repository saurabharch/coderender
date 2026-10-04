import { NextResponse } from "next/server";
import { z } from "zod";
import { waActiveProvider, wahaConfigured, wahaStatus } from "@/lib/waha";
import { getPref, setPref } from "@/lib/store";
import { sessionUser } from "@/lib/auth";

export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const active = waActiveProvider();
  let session: { status: string; me?: string } = { status: "n/a" };
  if (active === "waha") {
    session = await wahaStatus().catch(() => ({ status: "unreachable" }));
  }
  return NextResponse.json({
    active, wahaUrl: getPref("waha_url", ""), wahaConfigured: wahaConfigured(), session,
  });
}

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({
    provider: z.enum(["cloud-api", "waha", "off"]).optional(),
    wahaUrl: z.string().max(200).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad provider" }, { status: 422 });
  if (parsed.data.provider) setPref("wa_provider", parsed.data.provider);
  if (parsed.data.wahaUrl !== undefined) {
    setPref("waha_url", String(parsed.data.wahaUrl).replace(/\/$/, "").slice(0, 200));
  }
  return NextResponse.json({ ok: true, active: waActiveProvider() });
}
