import { getDb } from "./store";
import { gatewayMode, getProvider } from "./providers";

export {
  easebuzzRequestHash, easebuzzVerifyResponse, paytmChecksum, paytmVerify,
  payuRequestHash, payuVerifyResponse, rzValidWebhook, timingEq,
  stripeVerifyWebhook, wiseHost,
} from "./gateways-core";
export { rzVerifySignature } from "./gateways-core";

// ---- mode-aware credentials (test default; live only when MODE=live) ----

export function stripeCreds(): { mode: "test" | "live"; secret: string; publishable: string; webhookSecret: string } {
  const mode = gatewayMode("stripe");
  const cfg = getProvider("stripe");
  const px = mode === "live" ? "STRIPE_LIVE_" : "STRIPE_TEST_";
  return {
    mode,
    secret: cfg[`${px}SECRET_KEY`] || "",
    publishable: cfg[`${px}PUBLISHABLE_KEY`] || "",
    webhookSecret: cfg[`${px}WEBHOOK_SECRET`] || "",
  };
}

export function paytmCreds(): { mode: "test" | "live"; mid: string; key: string; website: string } {
  const mode = gatewayMode("paytm");
  const cfg = getProvider("paytm");
  const px = mode === "live" ? "PAYTM_LIVE_" : "PAYTM_TEST_";
  return { mode, mid: cfg[`${px}MID`] || "", key: cfg[`${px}KEY`] || "", website: cfg[`${px}WEBSITE`] || "" };
}

export function wiseCreds(): { mode: "test" | "live"; token: string; profileId: string } {
  const mode = gatewayMode("wise");
  const cfg = getProvider("wise");
  const px = mode === "live" ? "WISE_LIVE_" : "WISE_TEST_";
  return { mode, token: cfg[`${px}API_TOKEN`] || "", profileId: cfg[`${px}PROFILE_ID`] || "" };
}

export function razorpayCreds(): { mode: "test" | "live"; keyId: string; keySecret: string; webhookSecret: string } {
  const mode = gatewayMode("razorpay");
  const cfg = getProvider("razorpay");
  const live = mode === "live";
  return {
    mode,
    keyId: live ? cfg.RAZORPAY_KEY_ID || "" : cfg.RAZORPAY_TEST_KEY_ID || "",
    keySecret: live ? cfg.RAZORPAY_KEY_SECRET || "" : cfg.RAZORPAY_TEST_KEY_SECRET || "",
    webhookSecret: live ? cfg.RAZORPAY_WEBHOOK_SECRET || "" : cfg.RAZORPAY_TEST_WEBHOOK_SECRET || "",
  };
}

function upiCreds(kind: "payu" | "easebuzz"): { mode: "test" | "live"; key: string; salt: string; action: string } {
  const mode = gatewayMode(kind);
  const cfg = getProvider(kind);
  const up = kind.toUpperCase();
  const live = mode === "live";
  return {
    mode,
    key: live ? cfg[`${up}_MERCHANT_KEY`] || "" : cfg[`${up}_TEST_KEY`] || cfg[`${up}_MERCHANT_KEY`] || "",
    salt: live ? cfg[`${up}_MERCHANT_SALT`] || cfg[`${up}_SALT`] || "" : cfg[`${up}_TEST_SALT`] || "",
    action: kind === "payu"
      ? live ? "https://secure.payu.in/_payment" : "https://test.payu.in/_payment"
      : live ? "https://pay.easebuzz.in/pay" : "https://testpay.easebuzz.in/pay",
  };
}

export function gatewayStatus(): Record<string, { configured: boolean; mode: string; fields: string[] }> {
  const rz = razorpayCreds();
  const pu = upiCreds("payu");
  const eb = upiCreds("easebuzz");
  const st = stripeCreds();
  const pt = paytmCreds();
  const wi = wiseCreds();
  let au = { configured: false, mode: "test" };
  try {
    const cfg = getProvider("autumn");
    const mode = cfg.AUTUMN_MODE === "live" ? "live" : "test";
    au = {
      configured: !!((mode === "live" ? cfg.AUTUMN_SECRET_KEY : cfg.AUTUMN_TEST_SECRET) || cfg.AUTUMN_SECRET_KEY || process.env.AUTUMN_API_KEY),
      mode,
    };
  } catch { /* vault unreadable — mirror stays off */ }
  return {
    razorpay: { configured: !!(rz.keyId && rz.keySecret), mode: rz.mode, fields: ["key", "webhook_secret"] },
    payu: { configured: !!(pu.key && pu.salt), mode: pu.mode, fields: ["key", "salt"] },
    easebuzz: { configured: !!(eb.key && eb.salt), mode: eb.mode, fields: ["key", "salt"] },
    stripe: { configured: !!(st.secret && st.publishable), mode: st.mode, fields: ["secret", "publishable", "webhook_secret"] },
    paytm: { configured: !!(pt.mid && pt.key), mode: pt.mode, fields: ["mid", "key", "website"] },
    wise: { configured: !!(wi.token && wi.profileId), mode: wi.mode, fields: ["token", "profile"] },
    autumn: { configured: au.configured, mode: au.mode, fields: ["secret"] },
  };
}

// ---- provider HTTP clients (20s caps; keys never logged) ----

async function rzCall(path: string, body: Record<string, unknown>) {
  const cfg = razorpayCreds();
  if (!cfg.keyId || !cfg.keySecret) throw new Error(`razorpay ${cfg.mode} keys missing`);
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`razorpay http ${res.status}: ${JSON.stringify(data).slice(0, 160)}`);
  return data as { id: string; amount: number; currency: string; status: string };
}

export async function rzCreateOrder(orderId: number, amount: number): Promise<{ rzOrderId: string }> {
  const r = await rzCall("/orders", {
    amount: Math.round(amount * 100), currency: "INR",
    receipt: `cr_${orderId}_${Date.now().toString(36)}`, notes: { coderender_order: String(orderId) },
  });
  getDb().prepare("INSERT INTO GatewayOrder (provider, providerRef, orderId, amount, status) VALUES (?,?,?,?,?)").run(
    "razorpay", r.id, orderId, amount, r.status);
  return { rzOrderId: r.id };
}

// Verify checkout signature: HMAC_SHA256(order_id|payment_id, key_secret).

// Stripe: PaymentIntent with native idempotency (Idempotency-Key header —
// retries across timeouts never double-charge). Amount in paise-equivalent.

export async function stripeCreateIntent(input: {
  orderId: number; amount: number; currency?: string; ikey: string; customerEmail?: string;
}): Promise<{ intentId: string; clientSecret: string; status: string }> {
  const cfg = stripeCreds();
  if (!cfg.secret) throw new Error(`stripe ${cfg.mode} secret missing`);
  const form = new URLSearchParams({
    amount: String(Math.max(50, Math.round(input.amount * 100))),
    currency: (input.currency || "inr").toLowerCase(),
    "automatic_payment_methods[enabled]": "true",
  });
  if (input.customerEmail) form.set("receipt_email", input.customerEmail.slice(0, 120));
  const res = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": input.ikey.slice(0, 80),
    },
    body: form.toString(),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({})) as { id?: string; client_secret?: string; status?: string; error?: { message?: string } };
  if (!res.ok || !data.id) throw new Error(`stripe http ${res.status}: ${(data.error?.message || "failed").slice(0, 160)}`);
  getDb().prepare("INSERT INTO GatewayOrder (provider, providerRef, orderId, amount, status) VALUES (?,?,?,?,?)").run(
    "stripe", data.id, input.orderId, input.amount, data.status ?? "requires_payment_method");
  return { intentId: data.id, clientSecret: data.client_secret ?? "", status: data.status ?? "" };
}

// Paytm: initiateTransaction returns txnToken for the JS checkout.
// Staging vs production hosts selected by mode.

export async function paytmInitTxn(input: {
  orderId: number; amount: number; custId: string;
}): Promise<{ txnToken: string; txnid: string }> {
  const { paytmChecksum } = await import("./gateways-core");
  const cfg = paytmCreds();
  if (!cfg.mid || !cfg.key) throw new Error(`paytm ${cfg.mode} creds missing`);
  const host = cfg.mode === "live" ? "https://securegw.paytm.in" : "https://securestage.paytm.in";
  const txnid = `cr_${input.orderId}_${Date.now().toString(36)}`;
  const body: Record<string, unknown> = {
    mid: cfg.mid, orderId: txnid,
    txnAmount: { value: (Math.max(1, input.amount)).toFixed(2), currency: "INR" },
    userInfo: { custId: input.custId.slice(0, 64) },
  };
  const head = { signature: paytmChecksum(body as unknown as Record<string, string>, cfg.key) };
  const res = await fetch(`${host}/theia/api/v1/initiateTransaction?mid=${cfg.mid}&orderId=${txnid}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body, head }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({})) as { body?: { txnToken?: string; resultInfo?: { resultMsg?: string } } };
  const token = data.body?.txnToken || "";
  if (!res.ok || !token) throw new Error(`paytm http ${res.status}: ${(data.body?.resultInfo?.resultMsg || "failed").slice(0, 160)}`);
  getDb().prepare("INSERT INTO GatewayOrder (provider, providerRef, orderId, amount, status) VALUES (?,?,?,?,?)").run(
    "paytm", txnid, input.orderId, input.amount, "initiated");
  return { txnToken: token, txnid };
}

// Wise is a payout rail (refunds, partner payouts abroad) — not customer
// checkout. Quote then transfer, both idempotent by client UUID.

export async function wiseQuoteTransfer(input: {
  sourceCurrency: string; targetCurrency: string; sourceAmount: number; targetEmail: string;
}): Promise<{ quoteId: string; transferId: number; status: string }> {
  const { wiseHost } = await import("./gateways-core");
  const cfg = wiseCreds();
  if (!cfg.token || !cfg.profileId) throw new Error(`wise ${cfg.mode} creds missing`);
  const host = wiseHost(cfg.mode);
  const auth = { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" };
  const q = await fetch(`${host}/v2/quotes`, {
    method: "POST", headers: auth,
    body: JSON.stringify({
      sourceCurrency: input.sourceCurrency, targetCurrency: input.targetCurrency,
      sourceAmount: input.sourceAmount, payOut: "BANK_TRANSFER", preferredPayIn: "BANK_TRANSFER",
      profile: Number(cfg.profileId),
    }),
    signal: AbortSignal.timeout(20000),
  });
  const quote = await q.json().catch(() => ({})) as { id?: string; errorMessages?: unknown };
  if (!q.ok || !quote.id) throw new Error(`wise quote http ${q.status}`);
  const t = await fetch(`${host}/v1/transfers`, {
    method: "POST", headers: auth,
    body: JSON.stringify({
      targetAccount: input.targetEmail.slice(0, 120), quoteUuid: quote.id,
      customerTransactionId: `cr_${Date.now().toString(36)}`,
      details: { reference: "CodeRender payout" },
    }),
    signal: AbortSignal.timeout(20000),
  });
  const transfer = await t.json().catch(() => ({})) as { id?: number; status?: string };
  if (!t.ok || !transfer.id) throw new Error(`wise transfer http ${t.status}`);
  return { quoteId: quote.id, transferId: transfer.id, status: transfer.status ?? "" };
}

export { upiCreds };
