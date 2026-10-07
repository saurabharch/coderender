import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteLot, listLots, saveLot } from "@/lib/commerce";
import { shopGate } from "@/lib/shop-auth";

// GET ?productId= | ?lot= (batch search with product + stock + sold).
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  const lot = url.searchParams.get("lot") || "";
  if (lot.trim()) {
    const { findLot } = await import("@/lib/commerce");
    return NextResponse.json({ lots: findLot(lot) });
  }
  return NextResponse.json({ lots: listLots(Number(url.searchParams.get("productId") || 0)) });
}

export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({
    id: z.number().int().optional(), productId: z.number().int(),
    lot: z.string().max(40).optional(), mfg: z.string().max(10).optional(),
    exp: z.string().max(10).optional(), qty: z.number().min(0).max(1000000).optional(),
    cost: z.number().min(0).max(100000000).optional(), sell: z.number().min(0).max(100000000).optional(),
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
