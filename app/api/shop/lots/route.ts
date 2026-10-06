import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteLot, listLots, saveLot } from "@/lib/commerce";
import { shopGate } from "@/lib/shop-auth";

// GET ?productId= → lots. POST {...} → save. DELETE ?id=&productId= → drop.
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  return NextResponse.json({ lots: listLots(Number(new URL(req.url).searchParams.get("productId") || 0)) });
}

export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({
    id: z.number().int().optional(), productId: z.number().int(),
    lot: z.string().max(40).optional(), mfg: z.string().max(10).optional(),
    exp: z.string().max(10).optional(), qty: z.number().min(0).max(1000000).optional(),
    notes: z.string().max(200).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad lot" }, { status: 422 });
  try {
    return NextResponse.json({ ok: true, id: saveLot(parsed.data) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}

export async function DELETE(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const url = new URL(req.url);
  deleteLot(Number(url.searchParams.get("id") || 0), Number(url.searchParams.get("productId") || 0));
  return NextResponse.json({ ok: true });
}
