import { NextResponse } from "next/server";
import { z } from "zod";
import {
  listAssets, listExpenses, listRefunds, refundPayment, saveAsset, saveExpense, setExpenseStatus,
} from "@/lib/billing";
import { shopGate } from "@/lib/shop-auth";

// GET ?what=expenses|assets|refunds&status=
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  const what = url.searchParams.get("what") || "expenses";
  if (what === "assets") return NextResponse.json({ assets: listAssets() });
  if (what === "refunds") return NextResponse.json({ refunds: listRefunds() });
  return NextResponse.json({ expenses: listExpenses(url.searchParams.get("status") || "") });
}

// POST {what: expense|asset|expense-status|refund, ...}
export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  try {
    if (body?.what === "asset") {
      const parsed = z.object({
        what: z.literal("asset"), name: z.string().min(1).max(120),
        value: z.number().min(0).max(1000000000), depPct: z.number().min(0).max(100).optional(),
        purchasedAt: z.string().max(10).optional(), notes: z.string().max(500).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad asset" }, { status: 422 });
      return NextResponse.json({ ok: true, id: saveAsset(parsed.data) });
    }
    if (body?.what === "expense-status") {
      const parsed = z.object({
        what: z.literal("expense-status"), id: z.number().int(),
        to: z.enum(["approved", "paid", "rejected"]), accountId: z.number().int().optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad expense status" }, { status: 422 });
      setExpenseStatus(parsed.data.id, parsed.data.to, parsed.data.accountId ?? 1);
      return NextResponse.json({ ok: true });
    }
    if (body?.what === "refund") {
      const parsed = z.object({
        what: z.literal("refund"), paymentId: z.number().int(),
        amount: z.number().min(1).max(1000000000), reason: z.string().max(300).optional(),
        method: z.enum(["upi", "cash", "card"]).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad refund" }, { status: 422 });
      return NextResponse.json({ ok: true, id: refundPayment(parsed.data.paymentId, parsed.data.amount, parsed.data.reason ?? "", parsed.data.method ?? "upi") });
    }
    const parsed = z.object({
      what: z.literal("expense"), head: z.string().min(1).max(80),
      amount: z.number().min(1).max(1000000000), vendor: z.string().max(120).optional(),
      billRef: z.string().max(60).optional(), notes: z.string().max(500).optional(),
    }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "bad expense" }, { status: 422 });
    return NextResponse.json({ ok: true, id: saveExpense(parsed.data) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
