import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmIntent, createIntent } from "@/lib/vyapar";
import { shopGate } from "@/lib/shop-auth";
import { clientKey, rateLimited, slowDown } from "@/lib/rate-limit";

// POST {orderId?, billId?, amount, method?, ikey} → idempotent intent.
export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  if (rateLimited(`${clientKey(undefined, req)}|intent`, 60, 3600_000))
    return NextResponse.json(slowDown(), { status: 429 });
  const parsed = z.object({
    orderId: z.number().int().optional(), billId: z.number().int().optional(),
    amount: z.number().min(1).max(100000000), method: z.enum(["upi", "cash", "card"]).optional(),
    ikey: z.string().min(4).max(80),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad intent" }, { status: 422 });
  try {
    return NextResponse.json({ ok: true, ...createIntent(parsed.data) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}

// PUT {id, providerRef?} → confirm (recording payment + ledger, once).
export async function PUT(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({ id: z.number().int(), providerRef: z.string().max(120).optional() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad confirm" }, { status: 422 });
  try {
    return NextResponse.json({ ok: true, ...(await confirmIntent(parsed.data.id, parsed.data.providerRef ?? "")) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
