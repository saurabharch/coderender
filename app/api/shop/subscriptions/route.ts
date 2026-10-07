import { NextResponse } from "next/server";
import { z } from "zod";
import { billSub, cancelSub, listSubs, subscribe } from "@/lib/crm";
import { shopGate } from "@/lib/shop-auth";

// GET → subscriptions. POST {op} → subscribe|renew|cancel.
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  return NextResponse.json({ subs: listSubs(new URL(req.url).searchParams.get("status") || "") });
}

export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  try {
    if (body?.op === "subscribe") {
      const parsed = z.object({
        op: z.literal("subscribe"), customerId: z.number().int(),
        productId: z.number().int(), qty: z.number().min(0.001).max(1000000).optional(),
        cycle: z.enum(["monthly", "yearly"]).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad subscription" }, { status: 422 });
      return NextResponse.json({ ok: true, id: subscribe(parsed.data) });
    }
    if (body?.op === "renew") {
      const parsed = z.object({ op: z.literal("renew"), id: z.number().int() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad renew" }, { status: 422 });
      const oid = await billSub(parsed.data.id);
      return oid
        ? NextResponse.json({ ok: true, orderId: oid })
        : NextResponse.json({ error: "billing failed — see team notices" }, { status: 422 });
    }
    if (body?.op === "cancel") {
      const parsed = z.object({ op: z.literal("cancel"), id: z.number().int() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad cancel" }, { status: 422 });
      cancelSub(parsed.data.id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "unknown op" }, { status: 422 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
