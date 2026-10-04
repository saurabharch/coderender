import { NextResponse } from "next/server";
import { z } from "zod";
import { listCustomers, saveCustomer } from "@/lib/commerce";
import { shopGate } from "@/lib/shop-auth";

export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  return NextResponse.json({ customers: listCustomers(url.searchParams.get("q") || "") });
}

export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({
    id: z.number().int().optional(), name: z.string().min(1).max(120),
    phone: z.string().max(20).optional(), email: z.string().max(120).optional(),
    cgroup: z.string().max(30).optional(), tags: z.string().max(200).optional(),
    credit: z.number().min(0).max(100000000).optional(), notes: z.string().max(1000).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad customer" }, { status: 422 });
  return NextResponse.json({ ok: true, id: saveCustomer(parsed.data) });
}
