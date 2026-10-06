import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, getOrder, listOrders, quote, setOrderStatus } from "@/lib/commerce";
import { shopGate } from "@/lib/shop-auth";

const line = z.object({ productId: z.number().int(), qty: z.number().min(0.001).max(100000) });

// POST {lines, coupon?, inter?} → quote only (price check, no side effects).
export async function POST(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const parsed = z.object({
    lines: z.array(line).min(1).max(50), coupon: z.string().max(24).optional(), inter: z.boolean().optional(),
    channel: z.string().max(20).optional(), customerId: z.number().int().optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad cart" }, { status: 422 });
  try {
    return NextResponse.json({ ok: true, ...quote(parsed.data) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "quote failed" }, { status: 422 });
  }
}

// PUT {customerId?, lines, coupon?, ...} → create order. PATCH {id, to} → status.
export async function PUT(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({
    customerId: z.number().int().optional(), lines: z.array(line).min(1).max(50),
    coupon: z.string().max(24).optional(), inter: z.boolean().optional(),
    channel: z.string().max(20).optional(), notes: z.string().max(500).optional(),
    manualDiscount: z.number().min(0).max(100000000).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad order" }, { status: 422 });
  try {
    const id = await createOrder(parsed.data);
    return NextResponse.json({ ok: true, id, order: getOrder(id) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "order failed" }, { status: 422 });
  }
}

export async function PATCH(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({ id: z.number().int(), to: z.enum(["confirmed", "fulfilled", "cancelled", "returned"]) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad transition" }, { status: 422 });
  try {
    await setOrderStatus(parsed.data.id, parsed.data.to);
    return NextResponse.json({ ok: true, order: getOrder(parsed.data.id) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "transition failed" }, { status: 422 });
  }
}

export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id") || 0);
  if (id) {
    const o = getOrder(id);
    return o ? NextResponse.json(o) : NextResponse.json({ error: "no order" }, { status: 404 });
  }
  return NextResponse.json({ orders: listOrders(url.searchParams.get("status") || "") });
}
