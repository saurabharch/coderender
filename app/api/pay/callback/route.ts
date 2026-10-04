import { NextResponse } from "next/server";
import { getDb } from "@/lib/store";
import { recordPayment } from "@/lib/finance";
import { easebuzzVerifyResponse, payuVerifyResponse, rzValidWebhook } from "@/lib/gateways";
import { getProvider } from "@/lib/providers";

// Razorpay webhook: signature-checked, idempotent by provider event id.
export async function POST(req: Request) {
  const raw = await req.text().catch(() => "");
  const cfg = getProvider("razorpay");
  const sig = req.headers.get("x-razorpay-signature");
  if (!rzValidWebhook(raw, sig, cfg.RAZORPAY_WEBHOOK_SECRET || "")) {
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
  const provider = get("provider") === "easebuzz" ? "easebuzz" : "payu";
  const cfg = getProvider(provider);
  const key = provider === "payu" ? cfg.PAYU_MERCHANT_KEY : cfg.EASEBUZZ_MERCHANT_KEY;
  const salt = provider === "payu" ? cfg.PAYU_MERCHANT_SALT : cfg.EASEBUZZ_SALT;
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
