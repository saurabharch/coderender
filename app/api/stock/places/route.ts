import { NextResponse } from "next/server";
import { z } from "zod";
import { listSuppliers, listWarehouses, saveSupplier, saveWarehouse } from "@/lib/inventory";
import { shopGate } from "@/lib/shop-auth";

// GET ?what=warehouses|suppliers
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const what = new URL(req.url).searchParams.get("what") || "warehouses";
  return NextResponse.json(what === "suppliers" ? { suppliers: listSuppliers() } : { warehouses: listWarehouses() });
}

export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  if (body?.what === "supplier") {
    const parsed = z.object({
      id: z.number().int().optional(), name: z.string().min(1).max(120),
      phone: z.string().max(20).optional(), email: z.string().max(120).optional(),
      gstin: z.string().max(20).optional(), address: z.string().max(300).optional(),
      rating: z.number().min(0).max(5).optional(),
    }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "bad supplier" }, { status: 422 });
    return NextResponse.json({ ok: true, id: saveSupplier(parsed.data) });
  }
  const parsed = z.object({
    id: z.number().int().optional(), name: z.string().min(1).max(80),
    location: z.string().max(120).optional(), active: z.boolean().optional(),
  }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad warehouse" }, { status: 422 });
  return NextResponse.json({ ok: true, id: saveWarehouse(parsed.data) });
}
