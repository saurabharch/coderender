import { NextResponse } from "next/server";
import { z } from "zod";
import { getProductFull, productByCode, saveProduct } from "@/lib/commerce";
import { barcodeValid } from "@/lib/barcode-core";
import { shopGate } from "@/lib/shop-auth";

// GET ?code= → product/variant match (powers POS scan).
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const code = new URL(req.url).searchParams.get("code") || "";
  if (!code.trim()) return NextResponse.json({ error: "code required" }, { status: 422 });
  const hit = productByCode(code);
  if (!hit) return NextResponse.json({ error: "no product for this code" }, { status: 404 });
  return NextResponse.json({ ok: true, ...hit });
}

// POST {productId, barcode, barcodeType?} → (re)assign a code.
export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({
    productId: z.number().int(), barcode: z.string().min(1).max(40),
    barcodeType: z.enum(["isbn", "imei", "ean", "upc", "custom"]).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad code" }, { status: 422 });
  const full = getProductFull(parsed.data.productId) as { product: { name: string; price: number } } | null;
  if (!full) return NextResponse.json({ error: "no product" }, { status: 404 });
  const id = saveProduct({
    id: parsed.data.productId, name: full.product.name, price: full.product.price,
    barcode: parsed.data.barcode, barcodeType: parsed.data.barcodeType,
  });
  if (!barcodeValid(parsed.data.barcode, parsed.data.barcodeType ?? "")) {
    return NextResponse.json({ ok: true, id, warning: "format looks unusual — saved anyway" });
  }
  return NextResponse.json({ ok: true, id });
}
