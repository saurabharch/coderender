import { NextResponse } from "next/server";
import { z } from "zod";
import { renderLabelSheet, sheetSettings } from "@/lib/pdf-labels";
import { shopGate } from "@/lib/shop-auth";

const item = z.object({
  id: z.number().int().optional(), name: z.string().min(1).max(80),
  price: z.number().min(0).max(100000000).optional(),
  mrp: z.number().min(0).max(100000000).optional(),
  barcode: z.string().max(40).optional(), sku: z.string().max(40).optional(),
});

// POST {items[], settings?, mode?} → A4 label-sheet PDF download.
export async function POST(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const parsed = z.object({
    items: z.array(item).min(1).max(200),
    settings: z.unknown().optional(),
    mode: z.enum(["both", "qr", "barcode"]).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad sheet" }, { status: 422 });
  const settings = sheetSettings(parsed.data.settings ?? {});
  if (!settings) return NextResponse.json({ error: "bad settings" }, { status: 422 });
  try {
    const { bytes, stickers, pages } = await renderLabelSheet(
      parsed.data.items.map((x) => ({
        id: x.id ?? 0, name: x.name, price: x.price ?? 0, mrp: x.mrp ?? 0,
        barcode: x.barcode ?? "", sku: x.sku ?? "",
      })),
      settings,
      parsed.data.mode ?? "both",
    );
    if (!stickers) return NextResponse.json({ error: "nothing to print" }, { status: 422 });
    const body = new Uint8Array(bytes);
    return new NextResponse(body, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="labels-${stickers}x-${pages}p.pdf"`,
        "content-length": String(body.byteLength),
        "cache-control": "private, no-store",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "sheet failed" }, { status: 422 });
  }
}
