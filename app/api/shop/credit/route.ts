import { NextResponse } from "next/server";
import { z } from "zod";
import { collectUdhari, creditSale, udhariList } from "@/lib/commerce";
import { shopGate } from "@/lib/shop-auth";

// GET → balances due. POST {op: sale|collect, ...}.
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  return NextResponse.json({ dues: udhariList() });
}

export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  try {
    if (body?.op === "sale") {
      const parsed = z.object({
        op: z.literal("sale"), customerId: z.number().int(),
        lines: z.array(z.object({ productId: z.number().int(), qty: z.number().min(0.001).max(100000) })).min(1).max(50),
        coupon: z.string().max(24).optional(), notes: z.string().max(500).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad credit sale" }, { status: 422 });
      return NextResponse.json({ ok: true, id: await creditSale(parsed.data) });
    }
    const parsed = z.object({
      op: z.literal("collect"), customerId: z.number().int(),
      amount: z.number().min(1).max(100000000), method: z.enum(["cash", "upi", "card"]).optional(),
      accountId: z.number().int().optional(),
    }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "bad collect" }, { status: 422 });
    return NextResponse.json({ ok: true, ...collectUdhari(parsed.data.customerId, parsed.data.amount, parsed.data.method ?? "cash", parsed.data.accountId ?? 1) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
