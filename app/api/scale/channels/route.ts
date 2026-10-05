import { NextResponse } from "next/server";
import { z } from "zod";
import { ingestChannelOrder, listChannels, saveChannel } from "@/lib/scale";
import { shopGate } from "@/lib/shop-auth";
import { scaleGate } from "@/lib/scale-auth";

export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  return NextResponse.json({ channels: listChannels() });
}

// POST {name,...} → channel (RBAC: settings). PUT {channelId, extRef, lines, customerId?} → ingest order.
export async function POST(req: Request) {
  const g = await scaleGate(req, "settings");
  if (g instanceof NextResponse) return g;
  const parsed = z.object({
    id: z.number().int().optional(), name: z.string().min(1).max(80),
    kind: z.enum(["own", "marketplace", "social", "pos", "whatsapp"]).optional(),
    active: z.boolean().optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad channel" }, { status: 422 });
  return NextResponse.json({ ok: true, id: saveChannel(parsed.data, g.actor) });
}

export async function PUT(req: Request) {
  const g = await scaleGate(req, "sell", true);
  if (g instanceof NextResponse) return g;
  const parsed = z.object({
    channelId: z.number().int(), extRef: z.string().min(1).max(60),
    lines: z.array(z.object({ productId: z.number().int(), qty: z.number().min(0.001).max(100000) })).min(1).max(50),
    customerId: z.number().int().optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad ingest" }, { status: 422 });
  try {
    const id = await ingestChannelOrder(parsed.data.channelId, parsed.data.extRef, parsed.data.lines, parsed.data.customerId ?? 0);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "ingest failed" }, { status: 422 });
  }
}
