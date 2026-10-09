import { NextResponse } from "next/server";
import { z } from "zod";
import { dropRate, getVenue, listVenues, saveRate, saveVenue } from "@/lib/serviceops";
import { shopGate } from "@/lib/shop-auth";

// GET → venues (?status=). GET ?id= → venue + rates + live bookings.
// POST {op: venue|rate|dropRate, ...}.
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id") || 0);
  if (id) {
    const v = getVenue(id);
    return v ? NextResponse.json({ venue: v }) : NextResponse.json({ error: "no venue" }, { status: 404 });
  }
  return NextResponse.json({ venues: listVenues(url.searchParams.get("status") || "") });
}

export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  try {
    if (body?.op === "venue") {
      const parsed = z.object({
        op: z.literal("venue"), id: z.number().int().optional(), name: z.string().min(1).max(120),
        kind: z.enum(["hotel", "hall", "resort", "apartment", "room"]).optional(),
        address: z.string().max(300).optional(), capacity: z.number().min(0).max(100000).optional(),
        amenities: z.string().max(400).optional(), checkIn: z.string().max(5).optional(),
        checkOut: z.string().max(5).optional(),
        status: z.enum(["active", "paused", "closed"]).optional(), notes: z.string().max(500).optional(),
        requireApproval: z.boolean().optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad venue" }, { status: 422 });
      const { op: _op, ...input } = parsed.data;
      return NextResponse.json({ ok: true, id: saveVenue(input) });
    }
    if (body?.op === "rate") {
      const parsed = z.object({
        op: z.literal("rate"), id: z.number().int().optional(), venueId: z.number().int(),
        label: z.string().max(80), amount: z.number().min(1).max(1000000000),
        unit: z.enum(["hour", "night", "event", "day", "month"]).optional(),
        minStay: z.number().min(0).max(365).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad rate" }, { status: 422 });
      const { op: _op, ...input } = parsed.data;
      return NextResponse.json({ ok: true, id: saveRate(input) });
    }
    if (body?.op === "dropRate") {
      const parsed = z.object({ op: z.literal("dropRate"), id: z.number().int() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad drop" }, { status: 422 });
      dropRate(parsed.data.id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "unknown op" }, { status: 422 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "venue failed" }, { status: 422 });
  }
}
