import { NextResponse } from "next/server";
import { z } from "zod";
import {
  adjustStock, levelOf, lowStockList, receiveStock, stockAlertTick,
  stockLevels, stockMoves, transferStock,
} from "@/lib/inventory";
import { shopGate } from "@/lib/shop-auth";

// GET ?view=levels|moves|low&product=&warehouse=
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  const view = url.searchParams.get("view") || "levels";
  if (view === "moves") return NextResponse.json({ moves: stockMoves(Number(url.searchParams.get("product") || 0)) });
  if (view === "low") return NextResponse.json({ low: lowStockList() });
  return NextResponse.json({ levels: stockLevels(Number(url.searchParams.get("warehouse") || 0)) });
}

// POST {op: receive|issue|adjust|transfer, productId, qty|delta, warehouseId?, toWh?, ref?}
export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({
    op: z.enum(["receive", "adjust", "transfer", "alerts"]),
    productId: z.number().int().optional(),
    qty: z.number().min(0).max(1000000).optional(),
    delta: z.number().min(-1000000).max(1000000).optional(),
    warehouseId: z.number().int().min(1).optional(),
    toWh: z.number().int().min(1).optional(),
    cost: z.number().min(0).max(100000000).optional(),
    ref: z.string().max(120).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad move" }, { status: 422 });
  const d = parsed.data;
  const wh = d.warehouseId ?? 1;
  try {
    if (d.op === "alerts") return NextResponse.json({ ok: true, alerted: stockAlertTick() });
    if (!d.productId) return NextResponse.json({ error: "productId required" }, { status: 422 });
    if (d.op === "receive") receiveStock(d.productId, d.qty ?? 0, wh, d.cost ?? 0, d.ref || "receive");
    else if (d.op === "adjust") adjustStock(d.productId, d.delta ?? 0, d.ref || "adjust", wh);
    else transferStock(d.productId, wh, d.toWh ?? 0, d.qty ?? 0);
    return NextResponse.json({ ok: true, level: levelOf(d.productId, d.op === "transfer" ? wh : wh) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "move failed" }, { status: 422 });
  }
}
