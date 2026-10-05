import { NextResponse } from "next/server";
import { z } from "zod";
import { lastViewed, wishList, wishToggle } from "@/lib/commerce";
import { shopGate } from "@/lib/shop-auth";
import { clientKey, rateLimited, slowDown } from "@/lib/rate-limit";

// Customer-side discovery: wishlist + recently viewed. Fingerprint-scoped for
// guests; team/key gate keeps bots honest, rate limit keeps it cheap.
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  const fp = url.searchParams.get("fp") || "";
  const customerId = Number(url.searchParams.get("customerId") || 0);
  if (url.searchParams.get("view") === "recent") {
    return NextResponse.json({ recent: lastViewed(fp, customerId) });
  }
  if (!customerId) return NextResponse.json({ error: "customerId required" }, { status: 422 });
  return NextResponse.json({ wishlist: wishList(customerId) });
}

export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  if (rateLimited(`${clientKey(undefined, req)}|wish`, 60, 3600_000))
    return NextResponse.json(slowDown(), { status: 429 });
  const { flagOn } = await import("@/lib/flags");
  if (!flagOn("wishlist")) return NextResponse.json({ error: "wishlist is off" }, { status: 404 });
  const parsed = z.object({ customerId: z.number().int().min(1), productId: z.number().int().min(1) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad wish" }, { status: 422 });
  try {
    return NextResponse.json({ ok: true, ...wishToggle(parsed.data.customerId, parsed.data.productId) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
