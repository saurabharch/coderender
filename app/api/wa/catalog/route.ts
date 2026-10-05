import { NextResponse } from "next/server";
import { z } from "zod";
import { catalogueText } from "@/lib/commerce";
import { shopGate } from "@/lib/shop-auth";

// GET ?limit= → catalogue text (name · price · short). POST {to, limit?} → send via WhatsApp.
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  return NextResponse.json({ ok: true, ...catalogueText(Number(url.searchParams.get("limit") || 10)) });
}

export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({ to: z.string().min(8).max(20), limit: z.number().min(1).max(30).optional() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad send" }, { status: 422 });
  const d = catalogueText(parsed.data.limit ?? 10);
  const { flagOn } = await import("@/lib/flags");
  if (!flagOn("catalog_wa")) return NextResponse.json({ error: "catalogue sends are off" }, { status: 404 });
  const { sendWhatsApp } = await import("@/lib/providers");
  const r = await sendWhatsApp(parsed.data.to, d.text);
  if (!r.sent) return NextResponse.json({ error: `not delivered (${r.via})` }, { status: 422 });
  return NextResponse.json({ ok: true, count: d.count });
}
