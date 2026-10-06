import { NextResponse } from "next/server";
import { z } from "zod";
import { channelsOf, deletePrice, listCoupons, listPrices, listTaxes, priceFor, saveChannel, saveCoupon, savePrice, saveTax, SALE_CHANNELS } from "@/lib/commerce";
import { shopGate } from "@/lib/shop-auth";

// GET ?what=coupons|taxes|channels|prices&productId=
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  const what = url.searchParams.get("what") || "coupons";
  if (what === "taxes") return NextResponse.json({ taxes: listTaxes() });
  if (what === "channels" || what === "prices") {
    const pid = Number(url.searchParams.get("productId") || 0);
    if (!pid) return NextResponse.json({ error: "productId required" }, { status: 422 });
    return NextResponse.json(what === "channels"
      ? { channels: channelsOf(pid) }
      : { prices: listPrices(pid), current: priceFor(pid, {}) });
  }
  return NextResponse.json({ coupons: listCoupons() });
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
  if (body?.what === "channel") {
    const parsed = z.object({
      what: z.literal("channel"), productId: z.number().int(),
      channel: z.enum(SALE_CHANNELS as unknown as [string, ...string[]]),
      enabled: z.boolean().optional(), onlinePrice: z.number().min(0).max(100000000).optional(),
      minQty: z.number().min(0).max(1000000).optional(), maxQty: z.number().min(0).max(1000000).optional(),
    }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "bad channel" }, { status: 422 });
    try {
      saveChannel(parsed.data.productId, parsed.data.channel, parsed.data);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
    }
  }
  if (body?.what === "price" || body?.what === "price-del") {
    if (body.what === "price-del") {
      const parsed = z.object({ what: z.literal("price-del"), id: z.number().int(), productId: z.number().int() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad del" }, { status: 422 });
      deletePrice(parsed.data.id, parsed.data.productId);
      return NextResponse.json({ ok: true });
    }
    const parsed = z.object({
      what: z.literal("price"), id: z.number().int().optional(), productId: z.number().int(),
      variantId: z.number().int().optional(),
      priceType: z.enum(["mrp", "retail", "pos", "online", "wholesale", "marketplace", "member", "sale", "promotional", "cost"]),
      amount: z.number().min(0).max(100000000), minQty: z.number().min(0).max(1000000).optional(),
      startsAt: z.string().max(10).optional(), endsAt: z.string().max(10).optional(), active: z.boolean().optional(),
    }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "bad price" }, { status: 422 });
    try {
      return NextResponse.json({ ok: true, id: savePrice(parsed.data) });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
    }
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
