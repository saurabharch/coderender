import { NextResponse } from "next/server";
import { z } from "zod";
import { EXT_KINDS, getExt, saveExt, setAvail, suggestCategory } from "@/lib/commerce";
import { shopGate } from "@/lib/shop-auth";

// GET ?productId= → extension + availability. POST {op: ext|avail|categorize}.
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  return NextResponse.json({ ext: getExt(Number(new URL(req.url).searchParams.get("productId") || 0)) });
}

export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  try {
    if (body?.op === "categorize") {
      const parsed = z.object({ op: z.literal("categorize"), name: z.string().min(1).max(150) }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad name" }, { status: 422 });
      return NextResponse.json({ ok: true, ...suggestCategory(parsed.data.name) });
    }
    if (body?.op === "avail") {
      const parsed = z.object({
        op: z.literal("avail"), productId: z.number().int(),
        avail: z.enum(["in_stock", "out_of_stock", "preorder", "backorder", "coming_soon", "discontinued"]),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad avail" }, { status: 422 });
      setAvail(parsed.data.productId, parsed.data.avail);
      return NextResponse.json({ ok: true });
    }
    const parsed = z.object({
      op: z.literal("ext"), productId: z.number().int(),
      kind: z.enum(EXT_KINDS as unknown as [string, ...string[]]),
      payload: z.record(z.string(), z.string()).optional(),
    }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "bad ext" }, { status: 422 });
    saveExt(parsed.data.productId, parsed.data.kind, parsed.data.payload ?? {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
