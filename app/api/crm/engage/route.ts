import { NextResponse } from "next/server";
import { z } from "zod";
import { attentionFeed, listReviews, moderateReview, saveReview } from "@/lib/crm";
import { shopGate } from "@/lib/shop-auth";

// GET ?view=reviews|attention&status=
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  if ((url.searchParams.get("view") || "reviews") === "attention") return NextResponse.json({ attention: attentionFeed() });
  return NextResponse.json({ reviews: listReviews(url.searchParams.get("status") || "") });
}

// POST {rating, ...} → review (public-ish but team/key gated like other writes).
// PUT {id, to} → moderate.
export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({
    productId: z.number().int().optional(), customerId: z.number().int().optional(),
    rating: z.number().min(1).max(5), title: z.string().max(120).optional(), body: z.string().max(2000).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad review" }, { status: 422 });
  return NextResponse.json({ ok: true, id: saveReview(parsed.data) });
}

export async function PUT(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({ id: z.number().int(), to: z.enum(["approved", "spam"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad moderate" }, { status: 422 });
  try {
    moderateReview(parsed.data.id, parsed.data.to);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
