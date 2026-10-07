import { NextResponse } from "next/server";
import { z } from "zod";
import { createWorkOrder, listWorkOrders, produceWorkOrder, setWorkStatus } from "@/lib/inventory";
import { shopGate } from "@/lib/shop-auth";

// GET ?status= → work orders. POST {op} → create/start/produce/cancel.
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  return NextResponse.json({ orders: listWorkOrders(new URL(req.url).searchParams.get("status") || "") });
}

export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  try {
    if (body?.op === "create") {
      const parsed = z.object({
        op: z.literal("create"), productId: z.number().int(),
        qty: z.number().min(0.001).max(1000000), notes: z.string().max(300).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad order" }, { status: 422 });
      return NextResponse.json({ ok: true, id: createWorkOrder(parsed.data.productId, parsed.data.qty, parsed.data.notes ?? "") });
    }
    if (body?.op === "start" || body?.op === "cancel") {
      const parsed = z.object({ op: z.enum(["start", "cancel"]), id: z.number().int() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad op" }, { status: 422 });
      setWorkStatus(parsed.data.id, body.op === "start" ? "in-progress" : "cancelled");
      return NextResponse.json({ ok: true });
    }
    if (body?.op === "produce") {
      const parsed = z.object({
        op: z.literal("produce"), id: z.number().int(), qty: z.number().min(0.001).max(1000000),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad produce" }, { status: 422 });
      return NextResponse.json({ ok: true, ...produceWorkOrder(parsed.data.id, parsed.data.qty) });
    }
    return NextResponse.json({ error: "unknown op" }, { status: 422 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
