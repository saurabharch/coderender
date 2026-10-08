import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteVariant, getProductFull, listProducts, logView, saveProduct, saveVariant } from "@/lib/commerce";
import { shopGate } from "@/lib/shop-auth";
import { clientKey, rateLimited, slowDown } from "@/lib/rate-limit";

// Public catalogue reads (the storefront is public); writes stay gated.
// GET ?q=&status= | ?id= → full detail (variants, similar) + logs a view.
export async function GET(req: Request) {
  if (rateLimited(`${clientKey(undefined, req)}|catalog`, 120, 60_000))
    return NextResponse.json(slowDown(), { status: 429 });
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id") || 0);
  if (id) {
    const full = getProductFull(id);
    if (!full) return NextResponse.json({ error: "no product" }, { status: 404 });
    try {
      const { clientKey } = await import("@/lib/rate-limit");
      logView(url.searchParams.get("fp") || clientKey(undefined, req), 0, id);
    } catch { /* views never break reads */ }
    return NextResponse.json(full);
  }
  return NextResponse.json({
    products: listProducts({ q: url.searchParams.get("q") || "", status: url.searchParams.get("status") || "" }),
  });
}

const schema = z.object({
  id: z.number().int().optional(), name: z.string().min(1).max(150),
  sku: z.string().max(40).optional(), kind: z.enum(["physical", "digital", "service"]).optional(),
  price: z.number().min(0).max(100000000).optional(), mrp: z.number().min(0).max(100000000).optional(),
  unit: z.string().max(10).optional(), perPack: z.number().min(1).max(10000).optional(),
  taxPct: z.number().min(0).max(100).optional(), hsn: z.string().max(8).optional(), stock: z.number().min(0).max(1000000).optional(),
  status: z.enum(["active", "draft", "archived"]).optional(),
  media: z.array(z.string().max(300)).max(8).optional(),
  seo: z.record(z.string(), z.string()).optional(), attrs: z.record(z.string(), z.string()).optional(),
  category: z.string().max(60).optional(), subcategory: z.string().max(60).optional(),
  shortDesc: z.string().max(300).optional(), description: z.string().max(8000).optional(),
  specs: z.record(z.string(), z.string()).optional(),
  images: z.array(z.string().max(300)).max(10).optional(),
  videos: z.array(z.string().max(300)).max(3).optional(),
  barcode: z.string().max(40).optional(),
  barcodeType: z.enum(["isbn", "imei", "ean", "upc", "custom"]).optional(),
  bin: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad product" }, { status: 422 });
  return NextResponse.json({ ok: true, id: saveProduct(parsed.data) });
}

// PUT {productId, ...variant} → save variant. DELETE ?id=&productId= → drop variant.
export async function PUT(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({
    id: z.number().int().optional(), productId: z.number().int(),
    name: z.string().max(120).optional(), sku: z.string().max(40).optional(),
    attrs: z.record(z.string(), z.string()).optional(),
    price: z.number().min(0).max(100000000).optional(), mrp: z.number().min(0).max(100000000).optional(),
    stock: z.number().min(0).max(1000000).optional(),
    barcode: z.string().max(40).optional(),
    barcodeType: z.enum(["isbn", "imei", "ean", "upc", "custom"]).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad variant" }, { status: 422 });
  try {
    return NextResponse.json({ ok: true, id: saveVariant(parsed.data) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}

export async function DELETE(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const url = new URL(req.url);
  deleteVariant(Number(url.searchParams.get("id") || 0), Number(url.searchParams.get("productId") || 0));
  return NextResponse.json({ ok: true });
}
