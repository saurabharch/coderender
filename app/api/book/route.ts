import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmHold, holdBooking, resourceBookings } from "@/lib/booking";
import { getVenue, listVenues } from "@/lib/serviceops";
import { getDb } from "@/lib/store";
import { rateLimited, slowDown, clientKey } from "@/lib/rate-limit";
import { humanCookie } from "@/lib/captcha";

async function humanOk(req: Request): Promise<boolean> {
  const { activeProvider } = await import("@/lib/slider-captcha");
  if (activeProvider() === "off") return true;
  const jar = req.headers.get("cookie") || "";
  return jar.split(";").some((c) => c.trim() === `cr_human=${humanCookie()}`);
}

// GET ?kind=&q=&from=&to= → venues with live availability. GET ?venue=<id>
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("venue") || 0);
  if (id) {
    const v = getVenue(id);
    return v ? NextResponse.json({ venue: v }) : NextResponse.json({ error: "no venue" }, { status: 404 });
  }
  const kind = (url.searchParams.get("kind") || "").slice(0, 20);
  const q = (url.searchParams.get("q") || "").slice(0, 60).toLowerCase();
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const all = listVenues("active") as
    { id: number; name: string; kind: string; capacity: number; amenities: string }[];
  const out = all
    .filter((v) => (!kind || v.kind === kind) && (!q || v.name.toLowerCase().includes(q) || v.amenities.toLowerCase().includes(q)))
    .slice(0, 30)
    .map((v) => {
      let busy = false;
      if (from && to) {
        const hits = resourceBookings("venue", v.id, from, to) as unknown[];
        busy = hits.length > 0;
      }
      return { ...v, busy };
    });
  return NextResponse.json({ venues: out });
}

// POST {op: quote|hold|confirm, ...} — captcha-gated, rate-limited.
export async function POST(req: Request) {
  if (!(await humanOk(req))) {
    return NextResponse.json({ error: "Prove you're human first — solve the quick check in the chat." }, { status: 403 });
  }
  const fp = req.headers.get("x-fingerprint") || "anon";
  if (rateLimited(`${clientKey(fp, req)}|book-public`, 20, 3600_000))
    return NextResponse.json(slowDown(), { status: 429 });
  const body = await req.json().catch(() => null);
  try {
    if (body?.op === "quote") {
      const parsed = z.object({
        op: z.literal("quote"), venueId: z.number().int(),
        unit: z.enum(["hour", "night", "event", "day", "month"]).optional(),
        qty: z.number().min(1).max(365).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad quote" }, { status: 422 });
      const v = getVenue(parsed.data.venueId) as
        { rates: { label: string; amount: number; unit: string }[] } | null;
      if (!v) return NextResponse.json({ error: "no venue" }, { status: 404 });
      const rate = v.rates.find((r) => r.unit === (parsed.data.unit ?? "event")) ?? v.rates[0];
      if (!rate) return NextResponse.json({ error: "no rates for this venue yet" }, { status: 422 });
      const qty = Math.max(1, Math.round(parsed.data.qty ?? 1));
      return NextResponse.json({ ok: true, rate, qty, total: rate.amount * qty });
    }
    if (body?.op === "hold") {
      const parsed = z.object({
        op: z.literal("hold"), venueId: z.number().int(),
        startAt: z.string().max(25), endAt: z.string().max(25),
        name: z.string().max(120).optional(), phone: z.string().max(20).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad hold" }, { status: 422 });
      const v = getVenue(parsed.data.venueId);
      if (!v) return NextResponse.json({ error: "no venue" }, { status: 404 });
      const { id, expiresAt } = await holdBooking({
        resourceKind: "venue", resourceId: parsed.data.venueId,
        name: parsed.data.name, phone: parsed.data.phone,
        startAt: parsed.data.startAt, endAt: parsed.data.endAt,
      });
      return NextResponse.json({ ok: true, id, expiresAt });
    }
    if (body?.op === "confirm") {
      const parsed = z.object({
        op: z.literal("confirm"), id: z.number().int(),
        name: z.string().min(1).max(120), phone: z.string().min(7).max(20),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad confirm" }, { status: 422 });
      const { getDb } = await import("@/lib/store");
      const held = getDb().prepare("SELECT resourceKind, resourceId FROM Booking WHERE id=?").get(parsed.data.id) as
        { resourceKind: string; resourceId: number } | undefined;
      let needsApproval = false;
      if (held?.resourceKind === "venue") {
        const { getVenue } = await import("@/lib/serviceops");
        const v = getVenue(held.resourceId) as { requireApproval?: number } | null;
        needsApproval = !!v?.requireApproval;
      }
      if (needsApproval) {
        getDb().prepare("UPDATE Booking SET status='pending', name=?, phone=? WHERE id=? AND status='held'")
          .run(parsed.data.name, parsed.data.phone, parsed.data.id);
        return NextResponse.json({ ok: true, id: parsed.data.id, pending: true });
      }
      confirmHold(parsed.data.id);
      // Ledger-safe: no money moves online. A lead row hands sales the follow-up.
      const { createLead } = await import("@/lib/leads");
      const { id: leadId } = await createLead({
        name: parsed.data.name, phone: parsed.data.phone,
        businessType: "venue-booking", source: "book",
        message: `Booking #${parsed.data.id} confirmed online — pay at venue.`,
      });
      return NextResponse.json({ ok: true, id: parsed.data.id, leadId });
    }
    return NextResponse.json({ error: "unknown op" }, { status: 422 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "booking failed";
    const code = msg === "slot taken for this resource" ? 409 : 422;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
