import { NextResponse } from "next/server";
import { z } from "zod";
import { logCustomer, loyaltyOf, redeemPoints, segment, segmentList, setStage, timeline } from "@/lib/crm";
import { CRM_STAGES } from "@/lib/crm-core";
import { shopGate } from "@/lib/shop-auth";

// GET ?id= → profile (segment+spend+loyalty+timeline) | ?segment=&… | ?id=&timeline=1
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  const seg = url.searchParams.get("segment");
  if (seg) return NextResponse.json({ customers: segmentList(seg as never) });
  const id = Number(url.searchParams.get("id") || 0);
  if (!id) return NextResponse.json({ error: "id or segment required" }, { status: 422 });
  return NextResponse.json({ ...segment(id), loyalty: loyaltyOf(id), timeline: timeline(id) });
}

// POST {id, stage} | {id, note}
export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  try {
    if (body?.stage) {
      const parsed = z.object({ id: z.number().int(), stage: z.enum(CRM_STAGES as unknown as [string, ...string[]]) }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad stage" }, { status: 422 });
      setStage(parsed.data.id, parsed.data.stage as never);
      return NextResponse.json({ ok: true });
    }
    const parsed = z.object({ id: z.number().int(), note: z.string().min(1).max(1000) }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "bad note" }, { status: 422 });
    logCustomer(parsed.data.id, "note", parsed.data.note);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}

// PUT {id, points} → redeem to discount paise.
export async function PUT(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({ id: z.number().int(), points: z.number().int().min(1).max(100000) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad redeem" }, { status: 422 });
  try {
    return NextResponse.json({ ok: true, ...(await redeemPoints(parsed.data.id, parsed.data.points)) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "redeem failed" }, { status: 422 });
  }
}
