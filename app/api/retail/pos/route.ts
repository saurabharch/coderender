import { NextResponse } from "next/server";
import { z } from "zod";
import { drawerToday, openDrawer, posSale, saveCart, settleDay } from "@/lib/retail";
import { shopGate } from "@/lib/shop-auth";

const line = z.object({ productId: z.number().int(), qty: z.number().min(0.001).max(100000) });

// GET → drawer state. POST cart|drawer|sale|settle by {op}.
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  return NextResponse.json({ drawer: drawerToday() });
}

export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  try {
    if (body?.op === "cart") {
      const parsed = z.object({ op: z.literal("cart"), customerId: z.number().int(), lines: z.array(line).min(1).max(50) }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad cart" }, { status: 422 });
      return NextResponse.json({ ok: true, id: saveCart(parsed.data.customerId, parsed.data.lines) });
    }
    if (body?.op === "drawer") {
      const parsed = z.object({ op: z.literal("drawer"), opening: z.number().min(0).max(100000000), by: z.string().max(120).optional() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad drawer" }, { status: 422 });
      const user = "counter";
      openDrawer(parsed.data.opening, parsed.data.by ?? user);
      return NextResponse.json({ ok: true, drawer: drawerToday() });
    }
    if (body?.op === "sale") {
      const parsed = z.object({
        op: z.literal("sale"), lines: z.array(line).min(1).max(50),
        customerId: z.number().int().optional(), method: z.enum(["cash", "upi", "card"]).optional(),
        cashIn: z.number().min(0).max(100000000).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad sale" }, { status: 422 });
      return NextResponse.json({ ok: true, ...(await posSale(parsed.data)) });
    }
    if (body?.op === "settle") {
      const parsed = z.object({ op: z.literal("settle"), counted: z.number().min(0).max(1000000000) }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad settle" }, { status: 422 });
      return NextResponse.json({ ok: true, ...settleDay(parsed.data.counted) });
    }
    return NextResponse.json({ error: "unknown op" }, { status: 422 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "pos failed" }, { status: 422 });
  }
}
