import { NextResponse } from "next/server";
import { z } from "zod";
import {
  chartOfAccounts, deleteSlide, joinSub, listLoans, listSlides, listSubs,
  profitLoss, renewSub, cancelSub, repayLoan, saveSlide, takeLoan,
} from "@/lib/vyapar";
import { shopGate } from "@/lib/shop-auth";

// GET ?view=pnl|chart|subs|loans|hero
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const view = new URL(req.url).searchParams.get("view") || "pnl";
  if (view === "chart") return NextResponse.json({ accounts: chartOfAccounts() });
  if (view === "subs") return NextResponse.json({ subs: listSubs() });
  if (view === "loans") return NextResponse.json({ loans: listLoans() });
  if (view === "hero") return NextResponse.json({ slides: listSlides() });
  return NextResponse.json(profitLoss());
}

// POST {op: sub|sub-renew|sub-cancel|loan|loan-repay|slide|slide-del, ...}
export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  try {
    const op = body?.op;
    if (op === "sub") {
      const p = z.object({ op: z.literal("sub"), plan: z.string().min(1).max(60), cycle: z.enum(["monthly", "yearly"]).optional() }).safeParse(body);
      if (!p.success) return NextResponse.json({ error: "bad sub" }, { status: 422 });
      return NextResponse.json({ ok: true, id: joinSub(p.data.plan, p.data.cycle ?? "monthly") });
    }
    if (op === "sub-renew" || op === "sub-cancel") {
      const p = z.object({ op: z.string(), id: z.number().int() }).safeParse(body);
      if (!p.success) return NextResponse.json({ error: "bad sub op" }, { status: 422 });
      if (op === "sub-renew") renewSub(p.data.id); else cancelSub(p.data.id);
      return NextResponse.json({ ok: true });
    }
    if (op === "loan") {
      const p = z.object({
        op: z.literal("loan"), provider: z.string().max(80).optional(),
        principal: z.number().min(1).max(1000000000),
        rateBps: z.number().min(0).max(100000).optional(), tenure: z.number().min(0).max(600).optional(),
      }).safeParse(body);
      if (!p.success) return NextResponse.json({ error: "bad loan" }, { status: 422 });
      return NextResponse.json({ ok: true, id: takeLoan(p.data) });
    }
    if (op === "loan-repay") {
      const p = z.object({ op: z.literal("loan-repay"), id: z.number().int(), amount: z.number().min(1).max(1000000000) }).safeParse(body);
      if (!p.success) return NextResponse.json({ error: "bad repay" }, { status: 422 });
      return NextResponse.json({ ok: true, ...repayLoan(p.data.id, p.data.amount) });
    }
    if (op === "slide") {
      const p = z.object({
        op: z.literal("slide"), id: z.number().int().optional(),
        image: z.string().max(300).optional(), title: z.string().max(120).optional(),
        subtitle: z.string().max(200).optional(), cta: z.string().max(40).optional(),
        href: z.string().max(200).optional(), anim: z.enum(["slide", "fade", "zoom"]).optional(),
        ord: z.number().min(0).max(100).optional(), active: z.boolean().optional(),
      }).safeParse(body);
      if (!p.success) return NextResponse.json({ error: "bad slide" }, { status: 422 });
      return NextResponse.json({ ok: true, id: saveSlide(p.data) });
    }
    if (op === "slide-del") {
      const p = z.object({ op: z.literal("slide-del"), id: z.number().int() }).safeParse(body);
      if (!p.success) return NextResponse.json({ error: "bad del" }, { status: 422 });
      deleteSlide(p.data.id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "unknown op" }, { status: 422 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
