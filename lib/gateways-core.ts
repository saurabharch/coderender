// Pure gateway hash math (no sqlite — safe for vitest).

import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes } from "node:crypto";

export function rzVerifySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  if (!secret) return false;
  const want = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return timingEq(Buffer.from(want), Buffer.from(String(signature)));
}

export function timingEq(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

// Razorpay webhook: X-Razorpay-Signature over raw body with webhook secret.

export function rzValidWebhook(raw: string, sig: string | null, secret: string): boolean {
  if (!secret || !sig) return false;
  const want = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  return timingEq(Buffer.from(want), Buffer.from(String(sig)));
}

// PayU: request hash = sha512(key|txnid|amount|productinfo|firstname|email|udf1..udf10|salt).

export function payuRequestHash(input: {
  key: string; txnid: string; amount: string; productinfo: string;
  firstname: string; email: string; udf?: string[]; salt: string;
}): string {
  const udf = [...(input.udf ?? []), ...Array(10).fill("")].slice(0, 10);
  const seq = [input.key, input.txnid, input.amount, input.productinfo, input.firstname, input.email, ...udf, input.salt].join("|");
  return createHash("sha512").update(seq).digest("hex");
}

// PayU response verify: sha512(salt|status|udf10..udf1|email|firstname|productinfo|amount|txnid|key),
// with optional additionalCharges prefix.

export function payuVerifyResponse(input: {
  key: string; txnid: string; amount: string; productinfo: string;
  firstname: string; email: string; udf?: string[]; salt: string;
  status: string; hash: string; additionalCharges?: string;
}): boolean {
  const udf = [...(input.udf ?? []), ...Array(10).fill("")].slice(0, 10).reverse();
  const parts = [input.salt, input.status, ...udf, input.email, input.firstname, input.productinfo, input.amount, input.txnid, input.key];
  if (input.additionalCharges) parts.unshift(input.additionalCharges);
  const want = createHash("sha512").update(parts.join("|")).digest("hex");
  return want === String(input.hash).toLowerCase();
}

// Easebuzz: request hash = sha512(key|txnid|amount|productinfo|firstname|email|udf1..udf10|surl|furl|salt).

export function easebuzzRequestHash(input: {
  key: string; txnid: string; amount: string; productinfo: string;
  firstname: string; email: string; udf?: string[]; salt: string;
  surl?: string; furl?: string;
}): string {
  const udf = [...(input.udf ?? []), ...Array(10).fill("")].slice(0, 10);
  const seq = [input.key, input.txnid, input.amount, input.productinfo, input.firstname, input.email, ...udf, input.surl ?? "", input.furl ?? "", input.salt].join("|");
  return createHash("sha512").update(seq).digest("hex");
}

// Easebuzz response: sha512(salt|status|udf10..udf1|email|firstname|productinfo|amount|txnid|key).

export function easebuzzVerifyResponse(input: {
  key: string; txnid: string; amount: string; productinfo: string;
  firstname: string; email: string; udf?: string[]; salt: string;
  status: string; hash: string;
}): boolean {
  const udf = [...(input.udf ?? []), ...Array(10).fill("")].slice(0, 10).reverse();
  const want = createHash("sha512").update(
    [input.salt, input.status, ...udf, input.email, input.firstname, input.productinfo, input.amount, input.txnid, input.key].join("|")
  ).digest("hex");
  return want === String(input.hash).toLowerCase();
}

// Stripe webhook: header "t=1492774577,v1=abc[,v0=...]"; signature over
// `${timestamp}.${rawBody}` with the webhook signing secret (whsec_*).
// Returns the event time when valid (tolerance-guarded), else null.

export function stripeVerifyWebhook(raw: string, header: string | null, secret: string, toleranceSec = 300): number | null {
  if (!secret || !header) return null;
  const parts = Object.fromEntries(String(header).split(",").map((kv) => {
    const i = kv.indexOf("=");
    return i < 0 ? ["", ""] : [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
  }));
  const t = Number(parts.t || 0);
  const sigs = String(header).split(",").filter((kv) => kv.trim().startsWith("v1=")).map((kv) => kv.trim().slice(3));
  if (!t || sigs.length === 0) return null;
  if (toleranceSec > 0 && Math.abs(Date.now() / 1000 - t) > toleranceSec) return null;
  const want = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  const ok = sigs.some((s) => timingEq(Buffer.from(want), Buffer.from(String(s).toLowerCase())));
  return ok ? t : null;
}

// Paytm checksum (documented pg-checksum algorithm): sort params, join
// with "|", append a random 4-char salt, SHA256, append salt, AES-128-CBC
// encrypt (key = merchant key, IV "@@@@&&&&####$$$$"), base64 out.
// Verify reverses it and recomputes with the extracted salt.

const PAYTM_IV = "@@@@&&&&####$$$$";

function paytmSalt(n = 4): string {
  const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const b = randomBytes(n);
  return [...b].map((x) => abc[x % abc.length]).join("");
}

function paytmBody(params: Record<string, string>): string {
  return Object.keys(params).filter((k) => k !== "CHECKSUMHASH" && params[k] !== undefined)
    .sort().map((k) => String(params[k])).join("|");
}

export function paytmChecksum(params: Record<string, string>, merchantKey: string): string {
  if (!merchantKey) throw new Error("paytm key missing");
  const salt = paytmSalt();
  const hash = createHash("sha256").update(`${paytmBody(params)}|${salt}`).digest("hex") + salt;
  const c = createCipheriv("aes-128-cbc", Buffer.from(merchantKey.slice(0, 16)), PAYTM_IV);
  return Buffer.concat([c.update(hash, "utf8"), c.final()]).toString("base64");
}

export function paytmVerify(params: Record<string, string>, merchantKey: string): boolean {
  if (!merchantKey) return false;
  const sum = String(params.CHECKSUMHASH || "");
  if (!sum) return false;
  try {
    const d = createDecipheriv("aes-128-cbc", Buffer.from(merchantKey.slice(0, 16)), PAYTM_IV);
    const plain = Buffer.concat([d.update(sum, "base64"), d.final()]).toString("utf8");
    const salt = plain.slice(-4);
    const body = { ...params };
    delete body.CHECKSUMHASH;
    const want = createHash("sha256").update(`${paytmBody(body)}|${salt}`).digest("hex") + salt;
    return timingEq(Buffer.from(want), Buffer.from(plain));
  } catch {
    return false;
  }
}

// Wise: Bearer-token API, no request signing. Sandbox vs production hosts.

export function wiseHost(mode: "test" | "live"): string {
  return mode === "live" ? "https://api.wise.com" : "https://api.sandbox.transferwise.tech";
}
