import { NextResponse } from "next/server";
import { z } from "zod";
import { collectUdhari, creditSale, getPlan, listPlans, payPlan, planDues, setCustomerTerms, udhariList, udhariStatement, writeOffUdhari } from "@/lib/commerce";
import { shopGate } from "@/lib/shop-auth";
import { sessionUser } from "@/lib/auth";

// GET → balances due. GET ?statement=<customerId> → statement.
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("statement") || 0);
  if (id) {
    try {
      return NextResponse.json({ ok: true, ...(await udhariStatement(id)) });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 404 });
    }
  }
  const planId = Number(url.searchParams.get("plan") || 0);
  if (planId) {
    const plan = getPlan(planId);
    return plan ? NextResponse.json({ plan }) : NextResponse.json({ error: "no plan" }, { status: 404 });
  }
  const plansFor = Number(url.searchParams.get("plans") || 0);
  if (plansFor) return NextResponse.json({ plans: listPlans(plansFor) });
  return NextResponse.json({ dues: udhariList() });
}

export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  try {
    if (body?.op === "sale") {
      const parsed = z.object({
        op: z.literal("sale"), customerId: z.number().int(),
        lines: z.array(z.object({ productId: z.number().int(), qty: z.number().min(0.001).max(100000) })).min(1).max(50),
        coupon: z.string().max(24).optional(), notes: z.string().max(500).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad credit sale" }, { status: 422 });
      return NextResponse.json({ ok: true, id: await creditSale(parsed.data) });
    }
    if (body?.op === "remind") {
      const { udhariReminderTick } = await import("@/lib/vyapar");
      return NextResponse.json({ ok: true, sent: await udhariReminderTick() });
    }
    if (body?.op === "plan") {
      const parsed = z.object({
        op: z.literal("plan"), customerId: z.number().int(),
        slices: z.array(z.object({ dueAt: z.string().max(10), amount: z.number().min(1).max(100000000) })).min(1).max(24),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad plan" }, { status: 422 });
      try {
        return NextResponse.json({ ok: true, id: planDues(parsed.data.customerId, parsed.data.slices) });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
      }
    }
    if (body?.op === "payplan") {
      const parsed = z.object({
        op: z.literal("payplan"), planId: z.number().int(),
        amount: z.number().min(1).max(100000000), method: z.enum(["cash", "upi", "card"]).optional(),
        accountId: z.number().int().optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad payplan" }, { status: 422 });
      try {
        return NextResponse.json({ ok: true, ...(await payPlan(parsed.data.planId, parsed.data.amount, parsed.data.method ?? "cash", parsed.data.accountId ?? 1)) });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
      }
    }
    if (body?.op === "terms") {
      const p2 = z.object({ op: z.literal("terms"), customerId: z.number().int(), days: z.number().min(0).max(365) }).safeParse(body);
      if (!p2.success) return NextResponse.json({ error: "bad terms" }, { status: 422 });
      await setCustomerTerms(p2.data.customerId, p2.data.days);
      return NextResponse.json({ ok: true });
    }
    if (body?.op === "writeoff") {
      const me = await sessionUser();
      if (!me || me.role !== "owner") return NextResponse.json({ error: "owner only" }, { status: 403 });
      const p3 = z.object({ op: z.literal("writeoff"), customerId: z.number().int(), amount: z.number().min(1).max(100000000), reason: z.string().max(200).optional() }).safeParse(body);
      if (!p3.success) return NextResponse.json({ error: "bad writeoff" }, { status: 422 });
      return NextResponse.json({ ok: true, ...(await writeOffUdhari(p3.data.customerId, p3.data.amount, me.email, p3.data.reason ?? "")) });
    }
    const parsed = z.object({
      op: z.literal("collect"), customerId: z.number().int(),
      amount: z.number().min(1).max(100000000), method: z.enum(["cash", "upi", "card"]).optional(),
      accountId: z.number().int().optional(),
    }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "bad collect" }, { status: 422 });
    return NextResponse.json({ ok: true, ...collectUdhari(parsed.data.customerId, parsed.data.amount, parsed.data.method ?? "cash", parsed.data.accountId ?? 1) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
