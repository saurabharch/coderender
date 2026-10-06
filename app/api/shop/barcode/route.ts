import { NextResponse } from "next/server";
import { z } from "zod";
import { assignBarcode, backfillBarcodes, lookupBarcode, nextInternalCode } from "@/lib/barcode";
import { validateBarcode } from "@/lib/barcode-core";
import { shopGate } from "@/lib/shop-auth";

// POST {op: validate|generate|assign|backfill|quick-create, ...}
export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  try {
    if (body?.op === "validate") {
      const parsed = z.object({ op: z.literal("validate"), code: z.string().max(100) }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad validate" }, { status: 422 });
      return NextResponse.json(validateBarcode(parsed.data.code));
    }
    if (body?.op === "generate") {
      const parsed = z.object({ op: z.literal("generate"), ns: z.string().max(20).optional() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad generate" }, { status: 422 });
      return NextResponse.json({ ok: true, ...nextInternalCode(parsed.data.ns ?? "store") });
    }
    if (body?.op === "assign") {
      const parsed = z.object({
        op: z.literal("assign"), code: z.string().min(1).max(100),
        productId: z.number().int(), variantId: z.number().int().optional(), primary: z.boolean().optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad assign" }, { status: 422 });
      return NextResponse.json({ ok: true, ...assignBarcode(parsed.data) });
    }
    if (body?.op === "backfill") {
      return NextResponse.json({ ok: true, adopted: backfillBarcodes() });
    }
    if (body?.op === "serial-add" || body?.op === "serial-sell") {
      const parsed = z.object({
        op: z.string(), productId: z.number().int().optional(),
        serials: z.string().max(20000).optional(), serial: z.string().max(60).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad serial" }, { status: 422 });
      const { addSerials, markSerial } = await import("@/lib/barcode");
      if (body.op === "serial-add") {
        if (!parsed.data.productId) return NextResponse.json({ error: "productId required" }, { status: 422 });
        const list = String(parsed.data.serials || "").split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
        const added = addSerials(parsed.data.productId, 0, list);
        return NextResponse.json({ ok: true, added: added.ok, errors: added.errors });
      }
      if (!parsed.data.serial) return NextResponse.json({ error: "serial required" }, { status: 422 });
      const done = markSerial(parsed.data.serial, "SOLD");
      return NextResponse.json(done ? { ok: true } : { error: "unknown serial" }, { status: done ? 200 : 404 });
    }
    if (body?.op === "quick-create") {
      const parsed = z.object({
        op: z.literal("quick-create"), barcode: z.string().min(1).max(100),
        name: z.string().min(1).max(150), kind: z.enum(["physical", "service", "digital"]).optional(),
        price: z.number().min(0).max(100000000), cost: z.number().min(0).max(100000000).optional(),
        stock: z.number().min(0).max(1000000).optional(), unit: z.string().max(10).optional(),
        category: z.string().max(60).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad product" }, { status: 422 });
      const { quickCreate } = await import("@/lib/barcode");
      const created = await quickCreate(parsed.data);
      return NextResponse.json({ ok: true, id: created.id, barcode: created.barcode, type: created.type });
    }
    return NextResponse.json({ error: "unknown op" }, { status: 422 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg, code: msg }, { status: 422 });
  }
}

// GET ?code= → single indexed lookup (POS critical path).
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const code = new URL(req.url).searchParams.get("code") || "";
  const hit = lookupBarcode(code);
  if (!hit) return NextResponse.json({ error: "PRODUCT_NOT_FOUND", code: "PRODUCT_NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ ok: true, ...hit });
}
