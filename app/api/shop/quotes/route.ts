import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getQuote, listQuotes, quoteAccept, quoteCreate, quoteRevise, quoteStatus,
} from "@/lib/commerce";
import { shopGate } from "@/lib/shop-auth";

const line = z.object({ productId: z.number().int(), qty: z.number().min(0.001).max(100000) });

// GET → list (?status=). GET ?id= → quote with versions + lines.
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id") || 0);
  if (id) {
    const q = getQuote(id);
    return q ? NextResponse.json({ quote: q }) : NextResponse.json({ error: "no quote" }, { status: 404 });
  }
  return NextResponse.json({ quotes: listQuotes(url.searchParams.get("status") || "") });
}

// POST {op: create|revise|status|accept, ...}. Acceptance mints a live order.
export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  try {
    if (body?.op === "create" || body?.op === "revise") {
      const parsed = z.object({
        op: z.enum(["create", "revise"]), id: z.number().int().optional(),
        customerId: z.number().int().optional(),
        lines: z.array(line).min(1).max(50), coupon: z.string().max(24).optional(),
        inter: z.boolean().optional(), notes: z.string().max(500).optional(),
        validDays: z.number().min(1).max(90).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad quote" }, { status: 422 });
      if (parsed.data.op === "create") {
        const qid = await quoteCreate(parsed.data);
        return NextResponse.json({ ok: true, id: qid, quote: getQuote(qid) });
      }
      if (!parsed.data.id) return NextResponse.json({ error: "id required" }, { status: 422 });
      const v = await quoteRevise(parsed.data.id, parsed.data);
      return NextResponse.json({ ok: true, version: v, quote: getQuote(parsed.data.id) });
    }
    if (body?.op === "status") {
      const parsed = z.object({ op: z.literal("status"), id: z.number().int(), to: z.string().max(20) }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad transition" }, { status: 422 });
      quoteStatus(parsed.data.id, parsed.data.to);
      return NextResponse.json({ ok: true, quote: getQuote(parsed.data.id) });
    }
    if (body?.op === "accept") {
      const parsed = z.object({ op: z.literal("accept"), id: z.number().int() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad accept" }, { status: 422 });
      const orderId = await quoteAccept(parsed.data.id);
      return NextResponse.json({ ok: true, orderId, quote: getQuote(parsed.data.id) });
    }
    return NextResponse.json({ error: "unknown op" }, { status: 422 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "quote failed" }, { status: 422 });
  }
}
