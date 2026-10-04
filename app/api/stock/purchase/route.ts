import { NextResponse } from "next/server";
import { z } from "zod";
import { billPO, createPO, getPO, listPOs, payBill, receivePO, setPOStatus } from "@/lib/inventory";
import { shopGate } from "@/lib/shop-auth";

const line = z.object({ productId: z.number().int(), qty: z.number().min(0.001).max(1000000), cost: z.number().min(0).max(100000000) });

export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id") || 0);
  if (id) {
    const po = getPO(id);
    return po ? NextResponse.json(po) : NextResponse.json({ error: "no PO" }, { status: 404 });
  }
  return NextResponse.json({ orders: listPOs(url.searchParams.get("status") || "") });
}

// POST {supplierId, lines, notes?} → draft PO.
export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({
    supplierId: z.number().int(), lines: z.array(line).min(1).max(50), notes: z.string().max(500).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad PO" }, { status: 422 });
  try {
    const id = createPO(parsed.data);
    return NextResponse.json({ ok: true, id, po: getPO(id) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "PO failed" }, { status: 422 });
  }
}

// PUT {id, to} → status. PATCH {op: receive|bill|pay, ...} → next pipeline step.
export async function PUT(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({ id: z.number().int(), to: z.enum(["sent", "received", "billed", "paid", "cancelled"]) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad transition" }, { status: 422 });
  try {
    setPOStatus(parsed.data.id, parsed.data.to);
    return NextResponse.json({ ok: true, po: getPO(parsed.data.id) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "transition failed" }, { status: 422 });
  }
}

export async function PATCH(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  try {
    if (body?.op === "receive") {
      const parsed = z.object({
        id: z.number().int(), lines: z.array(z.object({ productId: z.number().int(), qty: z.number().min(0.001).max(1000000) })).min(1).max(50),
        warehouseId: z.number().int().min(1).optional(), notes: z.string().max(300).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad GRN" }, { status: 422 });
      const grn = receivePO(parsed.data.id, parsed.data.lines, parsed.data.warehouseId ?? 1, parsed.data.notes ?? "");
      return NextResponse.json({ ok: true, grn, po: getPO(parsed.data.id) });
    }
    if (body?.op === "bill") {
      const parsed = z.object({ id: z.number().int(), amount: z.number().min(1).max(1000000000).optional(), dueAt: z.string().max(10).optional() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad bill" }, { status: 422 });
      return NextResponse.json({ ok: true, bill: billPO(parsed.data.id, parsed.data.amount, parsed.data.dueAt ?? "") });
    }
    if (body?.op === "pay") {
      const parsed = z.object({ billId: z.number().int() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad pay" }, { status: 422 });
      payBill(parsed.data.billId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "unknown op" }, { status: 422 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "step failed" }, { status: 422 });
  }
}
