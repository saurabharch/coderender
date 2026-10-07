import { NextResponse } from "next/server";
import { z } from "zod";
import { bundleAvailability, deleteBundleItem, listBundle, saveBundleItem } from "@/lib/commerce";
import { shopGate } from "@/lib/shop-auth";

// GET ?productId= → kit components + availability. POST → set component.
// DELETE ?bundle=&product= → remove component.
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const id = Number(new URL(req.url).searchParams.get("productId") || 0);
  return NextResponse.json({ components: listBundle(id), availability: bundleAvailability(id) });
}

export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({
    bundleId: z.number().int(), productId: z.number().int(), qty: z.number().min(0.001).max(1000000),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad component" }, { status: 422 });
  try {
    saveBundleItem(parsed.data.bundleId, parsed.data.productId, parsed.data.qty);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}

export async function DELETE(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const url = new URL(req.url);
  deleteBundleItem(Number(url.searchParams.get("bundle") || 0), Number(url.searchParams.get("product") || 0));
  return NextResponse.json({ ok: true });
}
