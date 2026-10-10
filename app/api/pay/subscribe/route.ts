import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/store";
import { getPlan } from "@/lib/catalog";
import { createLead } from "@/lib/leads";
import { clientKey, rateLimited } from "@/lib/rate-limit";

// Public plan subscribe: package → lead → draft ClientOrder → idempotent
// PayIntent → provider payload. Safe to retry (same ikey returns the same
// intent + order — never double-charges). No login required.
// POST {packageId, name, phone, provider, email?}
export async function POST(req: Request) {
  if (rateLimited(`${clientKey(undefined, req)}|subscribe`, 10, 3600_000))
    return NextResponse.json({ error: "too many tries — wait an hour" }, { status: 429 });
  const parsed = z.object({
    packageId: z.number().int().min(1),
    name: z.string().min(2).max(80),
    phone: z.string().min(7).max(20),
    provider: z.enum(["razorpay", "payu", "easebuzz", "stripe", "paytm"]),
    email: z.string().max(120).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "name, phone, plan and provider required" }, { status: 422 });
  const d = parsed.data;
  const plan = getPlan(d.packageId);
  if (!plan || !plan.active) return NextResponse.json({ error: "plan unavailable" }, { status: 404 });
  // Scheduled offers price the order: expired/upcoming offers charge list.
  const { planEffective } = await import("@/lib/catalog-core");
  const amount = Math.max(1, planEffective({
    price: plan.price, mrp: plan.mrp, offerMode: plan.offerMode,
    offerValue: plan.offerValue, startsAt: plan.offerStartsAt, endsAt: plan.offerEndsAt,
  }).charge);
  const period = /\/mo/i.test(plan.per || "") ? new Date().toISOString().slice(0, 7) : "once";

  const db = getDb();
  let lead = db.prepare("SELECT id FROM Lead WHERE phone=? ORDER BY id DESC LIMIT 1").get(d.phone) as
    { id: number } | undefined;
  if (!lead) {
    const r = await createLead({ name: d.name, phone: d.phone, businessType: "general", source: "subscribe", message: plan.name });
    lead = { id: r.id };
  }
  const ikey = `plan_${plan.id}_${lead.id}_${period}`;

  const { findIntent, createIntent } = await import("@/lib/vyapar");
  const existing = findIntent(ikey);
  if (existing) {
    if (existing.status === "paid")
      return NextResponse.json({ ok: true, alreadyPaid: true, orderId: existing.orderId, intentId: existing.id });
    const order = db.prepare("SELECT * FROM ClientOrder WHERE id=?").get(existing.orderId) as
      { id: number; title: string; amount: number } | undefined;
    if (order) {
      try {
        const payload = await providerPayload(d.provider, order, { email: d.email, phone: d.phone, name: d.name });
        return NextResponse.json({ ok: true, resumed: true, orderId: order.id, intentId: existing.id, ...payload });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "provider failed" }, { status: 422 });
      }
    }
  }
  const orderId = Number(db.prepare("INSERT INTO ClientOrder (leadId, title, amount, status) VALUES (?,?,?,?)")
    .run(lead.id, `${plan.name} (${plan.per || "one-time"})`, amount, "draft").lastInsertRowid);
  const intent = createIntent({ orderId, amount, method: "card", ikey });
  try {
    const order = { id: orderId, title: `${plan.name} (${plan.per || "one-time"})`, amount };
    const payload = await providerPayload(d.provider, order, { email: d.email, phone: d.phone, name: d.name });
    return NextResponse.json({ ok: true, orderId, intentId: intent.id, ...payload });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "provider failed" }, { status: 422 });
  }
}

async function providerPayload(
  provider: "razorpay" | "payu" | "easebuzz" | "stripe" | "paytm",
  order: { id: number; title: string; amount: number },
  cust: { email?: string; phone: string; name: string },
): Promise<Record<string, unknown>> {
  const APP = process.env.APP_URL || "";
  if (provider === "razorpay") {
    const { rzCreateOrder, razorpayCreds } = await import("@/lib/gateways");
    const cfg = razorpayCreds();
    const r = await rzCreateOrder(order.id, order.amount);
    return { provider, mode: cfg.mode, keyId: cfg.keyId, ...r, amount: order.amount, currency: "INR" };
  }
  if (provider === "stripe") {
    const { stripeCreateIntent, stripeCreds } = await import("@/lib/gateways");
    const cfg = stripeCreds();
    if (!cfg.secret || !cfg.publishable) throw new Error(`stripe ${cfg.mode} keys missing`);
    const s = await stripeCreateIntent({
      orderId: order.id, amount: order.amount, currency: "inr",
      ikey: `pay_${order.id}_${cfg.mode}`, customerEmail: cust.email,
    });
    return { provider, mode: cfg.mode, publishableKey: cfg.publishable, intentId: s.intentId, clientSecret: s.clientSecret, amount: order.amount };
  }
  if (provider === "paytm") {
    const { paytmInitTxn, paytmCreds } = await import("@/lib/gateways");
    const cfg = paytmCreds();
    if (!cfg.mid || !cfg.key) throw new Error(`paytm ${cfg.mode} creds missing`);
    const p = await paytmInitTxn({ orderId: order.id, amount: order.amount, custId: cust.phone });
    return { provider, mode: cfg.mode, mid: cfg.mid, ...p, website: cfg.website || (cfg.mode === "live" ? "DEFAULT" : "WEBSTAGING"), amount: order.amount };
  }
  const { payuRequestHash, easebuzzRequestHash, upiCreds } = await import("@/lib/gateways");
  const txnid = `cr_${order.id}_${Date.now().toString(36)}`;
  const cfg = upiCreds(provider);
  if (!cfg.key || !cfg.salt) throw new Error(`${provider} ${cfg.mode} keys missing`);
  const hashInput = {
    key: cfg.key, txnid, amount: String(order.amount),
    productinfo: order.title.slice(0, 100), firstname: cust.name,
    email: cust.email || "customer@example.com", salt: cfg.salt,
  };
  const hash = provider === "payu" ? payuRequestHash(hashInput) : easebuzzRequestHash({ ...hashInput, surl: `${APP}/api/pay/callback?ok=1`, furl: `${APP}/api/pay/callback?ok=0` });
  return {
    provider, mode: cfg.mode, action: cfg.action,
    fields: {
      key: cfg.key, txnid, amount: String(order.amount),
      productinfo: order.title.slice(0, 100), firstname: cust.name,
      email: cust.email || "customer@example.com", phone: cust.phone, hash,
      surl: `${APP}/api/pay/callback?ok=1`, furl: `${APP}/api/pay/callback?ok=0`,
    },
  };
}
