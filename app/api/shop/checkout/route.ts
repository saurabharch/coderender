import { NextResponse } from "next/server";
import { z } from "zod";
import { publicCheckout } from "@/lib/commerce";
import { clientKey, rateLimited, slowDown } from "@/lib/rate-limit";

// Public checkout: name + phone + cart → draft order. Team confirms in console.
export async function POST(req: Request) {
  if (rateLimited(`${clientKey(undefined, req)}|checkout`, 10, 3600_000))
    return NextResponse.json(slowDown(), { status: 429 });
  const parsed = z.object({
    name: z.string().min(1).max(120), phone: z.string().min(8).max(20),
    address: z.string().max(300).optional(),
    lines: z.array(z.object({ productId: z.number().int(), qty: z.number().min(0.001).max(1000) })).min(1).max(20),
    coupon: z.string().max(24).optional(), method: z.enum(["cod", "upi"]).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad checkout" }, { status: 422 });
  try {
    const r = await publicCheckout(parsed.data);
    return NextResponse.json({ ok: true, ...r, message: `Order #${r.orderId} placed — we will confirm on call/WhatsApp.` });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "checkout failed" }, { status: 422 });
  }
}
