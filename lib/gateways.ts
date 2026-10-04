import { getDb } from "./store";
import { getProvider } from "./providers";

export {
  easebuzzRequestHash, easebuzzVerifyResponse, payuRequestHash,
  payuVerifyResponse, rzValidWebhook, timingEq,
} from "./gateways-core";
export { rzVerifySignature } from "./gateways-core";

export function gatewayStatus(): Record<string, { configured: boolean; fields: string[] }> {
  const rz = getProvider("razorpay");
  const pu = getProvider("payu");
  const eb = getProvider("easebuzz");
  return {
    razorpay: { configured: !!(rz.RAZORPAY_KEY_ID && rz.RAZORPAY_KEY_SECRET), fields: ["key", "webhook_secret"] },
    payu: { configured: !!(pu.PAYU_MERCHANT_KEY && pu.PAYU_MERCHANT_SALT), fields: ["key", "salt"] },
    easebuzz: { configured: !!(eb.EASEBUZZ_MERCHANT_KEY && eb.EASEBUZZ_SALT), fields: ["key", "salt"] },
  };
}

async function rzCall(path: string, body: Record<string, unknown>) {
  const cfg = getProvider("razorpay");
  if (!cfg.RAZORPAY_KEY_ID || !cfg.RAZORPAY_KEY_SECRET) throw new Error("razorpay keys missing");
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${cfg.RAZORPAY_KEY_ID}:${cfg.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
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
