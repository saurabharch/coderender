import { NextResponse } from "next/server";
import { z } from "zod";
import { listBins, saveBin } from "@/lib/commerce";
import { shopGate } from "@/lib/shop-auth";

// GET ?warehouse= → floor/rack/shelf bins. POST {...} → save bin.
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  return NextResponse.json({ bins: listBins(Number(url.searchParams.get("warehouse") || 0)) });
}

export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({
    id: z.number().int().optional(), warehouseId: z.number().int().min(1).optional(),
    floor: z.string().max(20).optional(), rack: z.string().max(20).optional(),
    shelf: z.string().max(20).optional(), code: z.string().max(40).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad bin" }, { status: 422 });
  return NextResponse.json({ ok: true, id: saveBin(parsed.data) });
}
