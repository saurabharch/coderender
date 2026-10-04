import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/store";
import { recordPayment } from "@/lib/finance";
import { easebuzzRequestHash, payuRequestHash, rzCreateOrder, rzVerifySignature } from "@/lib/gateways";
import { getProvider } from "@/lib/providers";
import { sessionUser } from "@/lib/auth";

// POST {provider: razorpay, orderId} → gateway order for checkout.
export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({
    provider: z.enum(["razorpay", "payu", "easebuzz"]),
    orderId: z.number().int(),
    firstname: z.string().max(80).optional(),
    email: z.string().max(120).optional(),
    phone: z.string().max(20).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad payment" }, { status: 422 });
  const d = parsed.data;
  const order = getDb().prepare("SELECT * FROM ClientOrder WHERE id=?").get(d.orderId) as
    { id: number; title: string; amount: number; leadId: number } | undefined;
  if (!order) return NextResponse.json({ error: "no order" }, { status: 404 });
  try {
    if (d.provider === "razorpay") {
      const r = await rzCreateOrder(order.id, order.amount);
      return NextResponse.json({ ok: true, ...r, amount: order.amount, currency: "INR" });
    }
    const { getProvider } = await import("@/lib/providers");
    const txnid = `cr_${order.id}_${Date.now().toString(36)}`;
    if (d.provider === "payu") {
      const cfg = getProvider("payu");
      if (!cfg.PAYU_MERCHANT_KEY || !cfg.PAYU_MERCHANT_SALT)
        return NextResponse.json({ error: "payu keys missing" }, { status: 422 });
      const hash = payuRequestHash({
        key: cfg.PAYU_MERCHANT_KEY, txnid, amount: String(order.amount),
        productinfo: order.title.slice(0, 100), firstname: d.firstname ?? "Customer",
        email: d.email ?? "customer@example.com", salt: cfg.PAYU_MERCHANT_SALT,
      });
      return NextResponse.json({
        ok: true, action: "https://secure.payu.in/_payment",
        fields: {
          key: cfg.PAYU_MERCHANT_KEY, txnid, amount: String(order.amount),
          productinfo: order.title.slice(0, 100), firstname: d.firstname ?? "Customer",
          email: d.email ?? "customer@example.com", phone: d.phone ?? "", hash,
          surl: "/api/pay/callback?ok=1", furl: "/api/pay/callback?ok=0",
        },
      });
    }
    const cfg = getProvider("easebuzz");
    if (!cfg.EASEBUZZ_MERCHANT_KEY || !cfg.EASEBUZZ_SALT)
      return NextResponse.json({ error: "easebuzz keys missing" }, { status: 422 });
    const hash = easebuzzRequestHash({
      key: cfg.EASEBUZZ_MERCHANT_KEY, txnid, amount: String(order.amount),
      productinfo: order.title.slice(0, 100), firstname: d.firstname ?? "Customer",
      email: d.email ?? "customer@example.com", salt: cfg.EASEBUZZ_SALT,
      surl: "/api/pay/callback?ok=1", furl: "/api/pay/callback?ok=0",
    });
    return NextResponse.json({
      ok: true, action: "https://pay.easebuzz.in/pay",
      fields: {
        key: cfg.EASEBUZZ_MERCHANT_KEY, txnid, amount: String(order.amount),
        productinfo: order.title.slice(0, 100), firstname: d.firstname ?? "Customer",
        email: d.email ?? "customer@example.com", phone: d.phone ?? "", hash,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}

// PUT {provider: razorpay, rzOrderId, rzPaymentId, signature} → verify + record.
export async function PUT(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({
    provider: z.literal("razorpay"),
    rzOrderId: z.string().max(60), rzPaymentId: z.string().max(60), signature: z.string().max(128),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad verify" }, { status: 422 });
  const secret = getProvider("razorpay").RAZORPAY_KEY_SECRET || "";
  if (!rzVerifySignature(parsed.data.rzOrderId, parsed.data.rzPaymentId, parsed.data.signature, secret))
    return NextResponse.json({ error: "bad signature" }, { status: 403 });
  const g = getDb().prepare("SELECT orderId, amount FROM GatewayOrder WHERE providerRef=?").get(parsed.data.rzOrderId) as
    { orderId: number; amount: number } | undefined;
  if (!g) return NextResponse.json({ error: "unknown order" }, { status: 404 });
  const id = await recordPayment(g.orderId, g.amount, "card", "paid");
  getDb().prepare("UPDATE GatewayOrder SET status='paid' WHERE providerRef=?").run(parsed.data.rzOrderId);
  return NextResponse.json({ ok: true, id });
}
