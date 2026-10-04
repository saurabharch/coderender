import { NextResponse } from "next/server";
import { z } from "zod";
import { listCoupons, listTaxes, saveCoupon, saveTax } from "@/lib/commerce";
import { shopGate } from "@/lib/shop-auth";

// GET ?what=coupons|taxes
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const what = new URL(req.url).searchParams.get("what") || "coupons";
  return NextResponse.json(what === "taxes" ? { taxes: listTaxes() } : { coupons: listCoupons() });
}

export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  if (body?.what === "tax") {
    const parsed = z.object({
      id: z.number().int().optional(), name: z.string().min(1).max(60),
      pct: z.number().min(0).max(100), inter: z.boolean().optional(),
      inclusive: z.boolean().optional(), active: z.boolean().optional(),
    }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "bad tax" }, { status: 422 });
    return NextResponse.json({ ok: true, id: saveTax(parsed.data) });
  }
  const parsed = z.object({
    code: z.string().min(2).max(24), kind: z.enum(["flat", "pct"]),
    value: z.number().min(0).max(100000000),
    maxOff: z.number().min(0).max(100000000).optional(), minOrder: z.number().min(0).max(100000000).optional(),
    startsAt: z.string().max(10).optional(), endsAt: z.string().max(10).optional(),
    maxUses: z.number().min(0).max(1000000).optional(), active: z.boolean().optional(),
  }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad coupon" }, { status: 422 });
  saveCoupon(parsed.data);
  return NextResponse.json({ ok: true });
}
