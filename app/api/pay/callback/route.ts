import { NextResponse } from "next/server";
import { getDb } from "@/lib/store";
import { recordPayment } from "@/lib/finance";
import { easebuzzVerifyResponse, paytmVerify, payuVerifyResponse, rzValidWebhook, stripeVerifyWebhook } from "@/lib/gateways";

// Webhooks: Stripe (Stripe-Signature) or Razorpay (X-Razorpay-Signature).
// Both verify first (403 otherwise), then confirm idempotently — retries
// and double-deliveries can never record twice.
export async function POST(req: Request) {
  const raw = await req.text().catch(() => "");
  // --- Stripe: signature over the raw body ---
  const stripeSig = req.headers.get("stripe-signature");
  if (stripeSig) {
    const { stripeCreds } = await import("@/lib/gateways");
    const cfg = stripeCreds();
    if (stripeVerifyWebhook(raw, stripeSig, cfg.webhookSecret || "") === null) {
      return NextResponse.json({ error: "bad signature" }, { status: 403 });
    }
    let body: { type?: string; data?: { object?: { id?: string; status?: string } } } = {};
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "bad json" }, { status: 422 });
    }
    if (body.type === "payment_intent.succeeded") {
      const pi = body.data?.object;
      if (pi?.id && pi.status === "succeeded") {
        const g = getDb().prepare("SELECT orderId, amount FROM GatewayOrder WHERE providerRef=?").get(pi.id) as
          { orderId: number; amount: number } | undefined;
        if (g) {
          const dup = getDb().prepare("SELECT id FROM Payment WHERE orderId=? AND amount=? AND status='paid'").get(g.orderId, g.amount);
          if (!dup) await recordPayment(g.orderId, g.amount, "card", "paid");
          getDb().prepare("UPDATE GatewayOrder SET status='paid' WHERE providerRef=?").run(pi.id);
          const { confirmIntent } = await import("@/lib/vyapar");
          const it = getDb().prepare("SELECT id FROM PayIntent WHERE orderId=? AND status='created' ORDER BY id DESC LIMIT 1").get(g.orderId) as { id: number } | undefined;
          if (it) await confirmIntent(it.id, pi.id).catch(() => {});
        }
      }
    }
    return NextResponse.json({ ok: true });
  }
  const { razorpayCreds } = await import("@/lib/gateways");
  const cfg = razorpayCreds();
  const sig = req.headers.get("x-razorpay-signature");
  if (!rzValidWebhook(raw, sig, cfg.webhookSecret || "")) {
    return NextResponse.json({ error: "bad signature" }, { status: 403 });
  }
  let body: { event?: string; payload?: { payment?: { entity?: { id: string; order_id: string; amount: number; status: string } } } } = {};
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 422 });
  }
  if (body.event === "payment.captured") {
    const p = body.payload?.payment?.entity;
    if (p?.order_id && p.status === "captured") {
      const g = getDb().prepare("SELECT orderId, amount FROM GatewayOrder WHERE providerRef=?").get(p.order_id) as
        { orderId: number; amount: number } | undefined;
      if (g) {
        const dup = getDb().prepare("SELECT id FROM Payment WHERE orderId=? AND amount=? AND status='paid'").get(g.orderId, Math.round(p.amount / 100));
        if (!dup) await recordPayment(g.orderId, Math.round(p.amount / 100), "card", "paid");
        getDb().prepare("UPDATE GatewayOrder SET status='paid' WHERE providerRef=?").run(p.order_id);
      }
    }
  }
  return NextResponse.json({ ok: true });
}

// PayU/Easebuzz return URLs verify the hash, then record.
export async function PUT(req: Request) {
  const form = await req.formData().catch(() => null);
  const get = (k: string) => String(form?.get(k) ?? "");
  const provider = get("provider") === "easebuzz" ? "easebuzz" : get("provider") === "paytm" ? "paytm" : "payu";
  // --- Paytm callback: CHECKSUMHASH over the posted params ---
  if (provider === "paytm") {
    const { paytmCreds } = await import("@/lib/gateways");
    const cfg = paytmCreds();
    const params: Record<string, string> = {};
    form?.forEach((v, k) => { params[k] = String(v).slice(0, 500); });
    if (!paytmVerify(params, cfg.key || ""))
      return NextResponse.json({ error: "not verified" }, { status: 403 });
    if (params.STATUS !== "TXN_SUCCESS") return NextResponse.json({ error: "not paid" }, { status: 402 });
    const g = getDb().prepare("SELECT orderId, amount FROM GatewayOrder WHERE providerRef=?").get(String(params.ORDERID || "")) as
      { orderId: number; amount: number } | undefined;
    if (!g) return NextResponse.json({ error: "unknown order" }, { status: 404 });
    const dup = getDb().prepare("SELECT id FROM Payment WHERE orderId=? AND amount=? AND status='paid'").get(g.orderId, g.amount);
    const id = dup ? (dup as { id: number }).id : await recordPayment(g.orderId, g.amount, "upi", "paid");
    getDb().prepare("UPDATE GatewayOrder SET status='paid' WHERE providerRef=?").run(String(params.ORDERID || ""));
    return NextResponse.json({ ok: true, id });
  }
  const { upiCreds } = await import("@/lib/gateways");
  const cfg = upiCreds(provider as "payu" | "easebuzz");
  const key = cfg.key;
  const salt = cfg.salt;
  if (!key || !salt) return NextResponse.json({ error: "keys missing" }, { status: 422 });
  const base = {
    key, txnid: get("txnid"), amount: get("amount"), productinfo: get("productinfo"),
    firstname: get("firstname"), email: get("email"),
    udf: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => get(`udf${i}`)),
    salt, status: get("status"), hash: get("hash"),
  };
  const ok = provider === "payu" ? payuVerifyResponse(base) : easebuzzVerifyResponse(base);
  if (!ok || get("status") !== "success") return NextResponse.json({ error: "not verified" }, { status: 403 });
  const orderId = Number((get("txnid").match(/^cr_(\d+)_/) ?? [])[1] || 0);
  if (!orderId) return NextResponse.json({ error: "unknown order" }, { status: 404 });
  const id = await recordPayment(orderId, Math.round(Number(get("amount")) || 0), "card", "paid");
  return NextResponse.json({ ok: true, id });
}
