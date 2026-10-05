import { NextResponse } from "next/server";
import { z } from "zod";
import { biSnapshot, listBudgets, planSnapshot, saveBudget } from "@/lib/people";
import { shopGate } from "@/lib/shop-auth";

// GET ?view=snapshot|plan|budgets&month=
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  const view = url.searchParams.get("view") || "snapshot";
  if (view === "plan") return NextResponse.json(planSnapshot());
  if (view === "budgets") return NextResponse.json({ budgets: listBudgets(url.searchParams.get("month") || "") });
  return NextResponse.json(biSnapshot());
}

// POST {head, month?, planned}
export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const parsed = z.object({
    head: z.string().min(1).max(80), month: z.string().regex(/^(\d{4}-\d{2})?$/),
    planned: z.number().min(1).max(1000000000),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad budget" }, { status: 422 });
  try {
    return NextResponse.json({ ok: true, id: saveBudget(parsed.data.head, parsed.data.month, parsed.data.planned) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
