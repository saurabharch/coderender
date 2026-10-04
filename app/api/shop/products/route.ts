import { NextResponse } from "next/server";
import { z } from "zod";
import { listProducts, saveProduct } from "@/lib/commerce";
import { shopGate } from "@/lib/shop-auth";

export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  return NextResponse.json({
    products: listProducts({ q: url.searchParams.get("q") || "", status: url.searchParams.get("status") || "" }),
  });
}

const schema = z.object({
  id: z.number().int().optional(), name: z.string().min(1).max(150),
  sku: z.string().max(40).optional(), kind: z.enum(["physical", "digital", "service"]).optional(),
  price: z.number().min(0).max(100000000), mrp: z.number().min(0).max(100000000).optional(),
  unit: z.string().max(10).optional(), perPack: z.number().min(1).max(10000).optional(),
  taxPct: z.number().min(0).max(100).optional(), stock: z.number().min(0).max(1000000).optional(),
  status: z.enum(["active", "draft", "archived"]).optional(),
  media: z.array(z.string().max(300)).max(8).optional(),
  seo: z.record(z.string(), z.string()).optional(), attrs: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad product" }, { status: 422 });
  return NextResponse.json({ ok: true, id: saveProduct(parsed.data) });
}
