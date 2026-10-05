import { NextResponse } from "next/server";
import { z } from "zod";
import { assessRoyalty, listFranchisees, listRoyalties, saveFranchisee } from "@/lib/scale";
import { shopGate } from "@/lib/shop-auth";
import { scaleGate } from "@/lib/scale-auth";

export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  return NextResponse.json(url.searchParams.get("royalties")
    ? { royalties: listRoyalties() } : { franchisees: listFranchisees() });
}

// POST {name,...} → franchisee (RBAC: partners). PUT {id, period} → assess royalty.
export async function POST(req: Request) {
  const g = await scaleGate(req, "partners");
  if (g instanceof NextResponse) return g;
  const parsed = z.object({
    id: z.number().int().optional(), name: z.string().min(1).max(120),
    territory: z.string().max(120).optional(), branchId: z.number().int().min(0).optional(),
    royaltyPct: z.number().min(0).max(100).optional(), active: z.boolean().optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad franchisee" }, { status: 422 });
  try {
    return NextResponse.json({ ok: true, id: saveFranchisee(parsed.data, g.actor) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}

export async function PUT(req: Request) {
  const g = await scaleGate(req, "partners");
  if (g instanceof NextResponse) return g;
  const parsed = z.object({ id: z.number().int(), period: z.string().regex(/^\d{4}-\d{2}$/) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "period like YYYY-MM" }, { status: 422 });
  try {
    return NextResponse.json({ ok: true, ...assessRoyalty(parsed.data.id, parsed.data.period, g.actor) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
