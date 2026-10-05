import { NextResponse } from "next/server";
import { z } from "zod";
import { campaignTick, launchCampaign, listCampaigns, saveCampaign } from "@/lib/retail";
import { shopGate } from "@/lib/shop-auth";

export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  return NextResponse.json({ campaigns: listCampaigns() });
}

// POST {name,...} → draft. PUT {id, to: launched} | {id} → run tick once.
export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({
    id: z.number().int().optional(), name: z.string().min(1).max(120),
    channel: z.enum(["email", "whatsapp", "push"]).optional(), segment: z.string().max(20).optional(),
    coupon: z.string().max(24).optional(), message: z.string().max(1000).optional(),
    runAt: z.string().max(16).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad campaign" }, { status: 422 });
  return NextResponse.json({ ok: true, id: saveCampaign(parsed.data) });
}

export async function PUT(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({ id: z.number().int(), launch: z.boolean().optional() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad launch" }, { status: 422 });
  try {
    if (parsed.data.launch) launchCampaign(parsed.data.id);
    const sent = await campaignTick();
    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
