import { NextResponse } from "next/server";
import { z } from "zod";
import { cancelBooking, placeBooking, resourceBookings } from "@/lib/booking";
import { shopGate } from "@/lib/shop-auth";

// GET ?kind=&resource= [&from=&to=] → live bookings for a resource.
// POST {op: book|cancel, ...} → atomic allocator (refusals are 409s).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const pdfId = Number(url.searchParams.get("pdf") || 0);
  if (pdfId) {
    // Confirmation downloads ride the public human gate (captcha cookie),
    // falling back to team session — same trust as making the booking.
    const { activeProvider } = await import("@/lib/slider-captcha");
    const { humanCookie } = await import("@/lib/captcha");
    const jar = req.headers.get("cookie") || "";
    const human = activeProvider() === "off"
      || jar.split(";").some((c) => c.trim() === `cr_human=${humanCookie()}`);
    if (!human) {
      const deny = await shopGate(req, false);
      if (deny) return deny;
    }
  } else {
    const deny = await shopGate(req, false);
    if (deny) return deny;
  }
  if (pdfId) {
    const { confirmationDoc } = await import("@/lib/booking");
    const doc = confirmationDoc(pdfId);
    if (!doc) return NextResponse.json({ error: "no booking" }, { status: 404 });
    const theme = url.searchParams.get("theme") === "minimal" ? "minimal" : "modern";
    const { renderBillPdf } = await import("@/lib/pdf-bill");
    const { getPref } = await import("@/lib/store");
    const pick = (k: string): string => {
      try { return getPref(k, ""); } catch { return ""; }
    };
    const bytes = await renderBillPdf(doc, {
      name: pick("biz_name") || "CodeRender",
      address: [pick("biz_address"), pick("biz_city"), pick("biz_state"), pick("biz_pin")].filter(Boolean).join(", "),
      phone: pick("contact_phone") || pick("biz_phone"),
      email: pick("contact_email") || pick("biz_email"),
      gstin: pick("biz_gstin"),
      primary: pick("brand_primary") || "#0F8F83",
    }, theme);
    const body = new Uint8Array(bytes);
    return new NextResponse(body, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${doc.no}-${theme}.pdf"`,
        "content-length": String(body.byteLength),
        "cache-control": "private, no-store",
      },
    });
  }
  const kind = (url.searchParams.get("kind") || "room").slice(0, 40);
  const resource = Number(url.searchParams.get("resource") || 0);
  if (!resource) return NextResponse.json({ error: "resource required" }, { status: 422 });
  return NextResponse.json({
    bookings: resourceBookings(kind, resource, url.searchParams.get("from") || "", url.searchParams.get("to") || ""),
  });
}

export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  try {
    if (body?.op === "book") {
      const parsed = z.object({
        op: z.literal("book"), resourceKind: z.string().min(1).max(40).optional(),
        resourceId: z.number().int(), customerId: z.number().int().optional(),
        name: z.string().max(120).optional(), phone: z.string().max(20).optional(),
        startAt: z.string().max(25), endAt: z.string().max(25),
        bufferMin: z.number().min(0).max(480).optional(), notes: z.string().max(500).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad booking" }, { status: 422 });
      const { op: _op, resourceKind, ...rest } = parsed.data;
      return NextResponse.json({ ok: true, id: placeBooking({ ...rest, resourceKind: resourceKind ?? "room" }) });
    }
    if (body?.op === "cancel") {
      const parsed = z.object({ op: z.literal("cancel"), id: z.number().int() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad cancel" }, { status: 422 });
      cancelBooking(parsed.data.id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "unknown op" }, { status: 422 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "booking failed";
    const code = msg === "slot taken for this resource" ? 409 : 422;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
