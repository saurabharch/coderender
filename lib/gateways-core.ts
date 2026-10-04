// Pure gateway hash math (no sqlite — safe for vitest).

import { createHmac, createHash } from "node:crypto";

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
