import { NextResponse } from "next/server";
import { z } from "zod";
import { createShipment, deleteCourier, listCouriers, listShipments, listZones, saveCourier, saveZone, setShipStatus } from "@/lib/retail";
import { shopGate } from "@/lib/shop-auth";

// GET ?status= | ?zones=1
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  if (url.searchParams.get("zones")) return NextResponse.json({ zones: listZones() });
  if (url.searchParams.get("couriers")) return NextResponse.json({ couriers: listCouriers() });
  return NextResponse.json({ shipments: listShipments(url.searchParams.get("status") || "") });
}

// POST {orderId,...} | {zone...} | PUT {id,to}
export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  try {
    if (body?.what === "courier") {
      const parsed = z.object({
        what: z.literal("courier"), id: z.number().int().optional(),
        name: z.string().min(1).max(60), url: z.string().max(300).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad courier" }, { status: 422 });
      return NextResponse.json({ ok: true, id: saveCourier(parsed.data) });
    }
    if (body?.what === "courier-del") {
      const parsed = z.object({ what: z.literal("courier-del"), id: z.number().int() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad del" }, { status: 422 });
      deleteCourier(parsed.data.id);
      return NextResponse.json({ ok: true });
    }
    if (body?.what === "zone") {
      const parsed = z.object({
        what: z.literal("zone"), id: z.number().int().optional(), name: z.string().min(1).max(60),
        charge: z.number().min(0).max(10000000).optional(), eta: z.string().max(40).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad zone" }, { status: 422 });
      return NextResponse.json({ ok: true, id: saveZone(parsed.data) });
    }
    const parsed = z.object({
      orderId: z.number().int(), courier: z.string().max(60).optional(),
      tracking: z.string().max(80).optional(), zone: z.string().max(40).optional(),
      charge: z.number().min(0).max(10000000).optional(), notes: z.string().max(300).optional(),
    }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "bad shipment" }, { status: 422 });
    return NextResponse.json({ ok: true, id: createShipment(parsed.data) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}

export async function PUT(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({
    id: z.number().int(),
    to: z.enum(["packed", "shipped", "delivered", "returned", "rto", "cancelled"]),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad transition" }, { status: 422 });
  try {
    setShipStatus(parsed.data.id, parsed.data.to);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
