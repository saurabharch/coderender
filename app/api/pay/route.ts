import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/store";
import { recordPayment } from "@/lib/finance";
import { easebuzzRequestHash, payuRequestHash, paytmCreds, rzCreateOrder, rzVerifySignature, razorpayCreds, stripeCreateIntent, stripeCreds, upiCreds } from "@/lib/gateways";
import { sessionUser } from "@/lib/auth";

// POST {provider: razorpay, orderId} → gateway order for checkout.
export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({
    provider: z.enum(["razorpay", "payu", "easebuzz", "stripe", "paytm"]),
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
    if (d.provider === "stripe") {
      const cfg = stripeCreds();
      if (!cfg.secret || !cfg.publishable)
        return NextResponse.json({ error: `stripe ${cfg.mode} keys missing` }, { status: 422 });
      const { createIntent } = await import("@/lib/vyapar");
      const intent = createIntent({
        orderId: order.id, amount: order.amount,
        method: "card", ikey: `pay_${order.id}_${cfg.mode}`,
      });
      if (intent.status === "paid") return NextResponse.json({ ok: true, alreadyPaid: true });
      const s = await stripeCreateIntent({
        orderId: order.id, amount: order.amount, currency: "inr",
        ikey: `pay_${order.id}_${cfg.mode}_${intent.id}`, customerEmail: d.email,
      });
      return NextResponse.json({
        ok: true, intentId: s.intentId, clientSecret: s.clientSecret,
        publishableKey: cfg.publishable, mode: cfg.mode, amount: order.amount,
      });
    }
    if (d.provider === "paytm") {
      const cfg = paytmCreds();
      if (!cfg.mid || !cfg.key)
        return NextResponse.json({ error: `paytm ${cfg.mode} creds missing` }, { status: 422 });
      const { paytmInitTxn } = await import("@/lib/gateways");
      const p = await paytmInitTxn({ orderId: order.id, amount: order.amount, custId: d.phone || `C${order.id}` });
      return NextResponse.json({
        ok: true, ...p, mid: cfg.mid, mode: cfg.mode,
        website: cfg.website || (cfg.mode === "live" ? "DEFAULT" : "WEBSTAGING"),
        amount: order.amount,
      });
    }
    const txnid = `cr_${order.id}_${Date.now().toString(36)}`;
    if (d.provider === "payu") {
      const cfg = upiCreds("payu");
      if (!cfg.key || !cfg.salt)
        return NextResponse.json({ error: `payu ${cfg.mode} keys missing` }, { status: 422 });
      const hash = payuRequestHash({
        key: cfg.key, txnid, amount: String(order.amount),
        productinfo: order.title.slice(0, 100), firstname: d.firstname ?? "Customer",
        email: d.email ?? "customer@example.com", salt: cfg.salt,
      });
      return NextResponse.json({
        ok: true, action: cfg.action, mode: cfg.mode,
        fields: {
          key: cfg.key, txnid, amount: String(order.amount),
          productinfo: order.title.slice(0, 100), firstname: d.firstname ?? "Customer",
          email: d.email ?? "customer@example.com", phone: d.phone ?? "", hash,
          surl: "/api/pay/callback?ok=1", furl: "/api/pay/callback?ok=0",
        },
      });
    }
    const cfg = upiCreds("easebuzz");
    if (!cfg.key || !cfg.salt)
      return NextResponse.json({ error: `easebuzz ${cfg.mode} keys missing` }, { status: 422 });
    const hash = easebuzzRequestHash({
      key: cfg.key, txnid, amount: String(order.amount),
      productinfo: order.title.slice(0, 100), firstname: d.firstname ?? "Customer",
      email: d.email ?? "customer@example.com", salt: cfg.salt,
      surl: "/api/pay/callback?ok=1", furl: "/api/pay/callback?ok=0",
    });
    return NextResponse.json({
      ok: true, action: cfg.action, mode: cfg.mode,
      fields: {
        key: cfg.key, txnid, amount: String(order.amount),
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
  const secret = razorpayCreds().keySecret;
  if (!rzVerifySignature(parsed.data.rzOrderId, parsed.data.rzPaymentId, parsed.data.signature, secret))
    return NextResponse.json({ error: "bad signature" }, { status: 403 });
  const g = getDb().prepare("SELECT orderId, amount FROM GatewayOrder WHERE providerRef=?").get(parsed.data.rzOrderId) as
    { orderId: number; amount: number } | undefined;
  if (!g) return NextResponse.json({ error: "unknown order" }, { status: 404 });
  const id = await recordPayment(g.orderId, g.amount, "card", "paid");
  getDb().prepare("UPDATE GatewayOrder SET status='paid' WHERE providerRef=?").run(parsed.data.rzOrderId);
  return NextResponse.json({ ok: true, id });
}
