import { NextResponse } from "next/server";
import { z } from "zod";
import { billFromOrder, createBill, getBill, listBills, sendBill, setBillStatus } from "@/lib/billing";
import { shopGate } from "@/lib/shop-auth";

const line = z.object({ label: z.string().min(1).max(150), qty: z.number().min(0.001).max(1000000), price: z.number().min(0).max(100000000) });

// GET ?id= | ?status=
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id") || 0);
  if (id) {
    const b = getBill(id);
    return b ? NextResponse.json({ bill: b }) : NextResponse.json({ error: "no bill" }, { status: 404 });
  }
  return NextResponse.json({ bills: listBills(url.searchParams.get("status") || "") });
}

// POST {type, lines, ...} | {orderId, type?} → numbered bill.
export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  try {
    if (body?.orderId) {
      const parsed = z.object({
        orderId: z.number().int(),
        type: z.enum(["invoice", "proforma", "estimate", "quotation", "challan"]).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad bill" }, { status: 422 });
      const r = billFromOrder(parsed.data.orderId, parsed.data.type ?? "invoice");
      return NextResponse.json({ ok: true, ...r, bill: getBill(r.id) });
    }
    const parsed = z.object({
      type: z.enum(["invoice", "proforma", "estimate", "quotation", "credit-note", "debit-note", "receipt", "challan"]),
      customerId: z.number().int().optional(), orderId: z.number().int().optional(),
      lines: z.array(line).min(1).max(50),
      discount: z.number().min(0).max(100000000).optional(), tax: z.number().min(0).max(100000000).optional(),
      notes: z.string().max(500).optional(),
    }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "bad bill" }, { status: 422 });
    const r = createBill(parsed.data);
    return NextResponse.json({ ok: true, ...r, bill: getBill(r.id) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "bill failed" }, { status: 422 });
  }
}

// PUT {id, to} → status. PATCH {id, channel} → send.
export async function PUT(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({ id: z.number().int(), to: z.enum(["sent", "paid", "overdue", "cancelled"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad status" }, { status: 422 });
  try {
    setBillStatus(parsed.data.id, parsed.data.to);
    return NextResponse.json({ ok: true, bill: getBill(parsed.data.id) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "status failed" }, { status: 422 });
  }
}

export async function PATCH(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({ id: z.number().int(), channel: z.enum(["email", "whatsapp"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad send" }, { status: 422 });
  try {
    return NextResponse.json({ ok: true, detail: await sendBill(parsed.data.id, parsed.data.channel) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "send failed" }, { status: 422 });
  }
}
