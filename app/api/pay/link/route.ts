import { NextResponse } from "next/server";
import { z } from "zod";
import { closePayLink, createPayLink, getPayLink, listQrs, saveQr, upiPayload } from "@/lib/vyapar";
import { shopGate } from "@/lib/shop-auth";

// GET ?token= (public pay page data) | ?qr=1 (static/dynamic UPI payloads)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  if (url.searchParams.get("qr") !== null) {
    const deny = await shopGate(req, false);
    if (deny) return deny;
    const qrs = listQrs() as { id: number; upiId: string; name: string; amount: number; label: string; active: number }[];
    return NextResponse.json({
      qrs: qrs.filter((q) => q.active).map((q) => ({ ...q, payload: upiPayload(q.upiId, q.name || "Merchant", q.amount) })),
    });
  }
  if (!token) return NextResponse.json({ error: "token required" }, { status: 422 });
  const l = getPayLink(token);
  if (!l || l.status !== "open") return NextResponse.json({ error: "link invalid or paid" }, { status: 404 });
  const qrs = (listQrs() as { upiId: string; name: string; active: number }[]).filter((q) => q.active);
  const upi = qrs[0] ? upiPayload(qrs[0].upiId, qrs[0].name || "Merchant", l.amount) : "";
  return NextResponse.json({ ok: true, amount: l.amount, billId: l.billId, orderId: l.orderId, upi });
}

// POST {billId?, orderId?, amount} → link (team). PUT {token} → close after gateway confirm.
export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  if (body?.qr) {
    const { saveQr } = await import("@/lib/vyapar");
    const parsed = z.object({
      qr: z.literal(true), upiId: z.string().min(3).max(60),
      name: z.string().max(60).optional(), amount: z.number().min(0).max(100000000).optional(),
      label: z.string().max(60).optional(),
    }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "bad qr" }, { status: 422 });
    try {
      return NextResponse.json({ ok: true, id: saveQr(parsed.data) });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
    }
  }
  const parsed = z.object({
    billId: z.number().int().optional(), orderId: z.number().int().optional(),
    amount: z.number().min(1).max(100000000),
  }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad link" }, { status: 422 });
  return NextResponse.json({ ok: true, ...createPayLink(parsed.data) });
}

export async function PUT(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({ token: z.string().min(4).max(40) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad token" }, { status: 422 });
  closePayLink(parsed.data.token);
  return NextResponse.json({ ok: true });
}
