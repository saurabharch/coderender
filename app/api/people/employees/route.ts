import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/store";
import { giveLoan, listEmployees, openLoans, saveEmployee } from "@/lib/people";
import { shopGate } from "@/lib/shop-auth";

export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  if (url.searchParams.get("loans")) {
    return NextResponse.json({ loans: openLoans(Number(url.searchParams.get("emp") || 0)) });
  }
  const one = Number(url.searchParams.get("id") || 0);
  if (one) {
    const emp = listEmployees().find((e) => e.id === one) as
      { id: number; name: string; designation: string; dept: string } | undefined;
    if (!emp) return NextResponse.json({ error: "no employee" }, { status: 404 });
    const today = new Date().toISOString().slice(0, 10);
    const mark = getDb().prepare("SELECT status FROM Attendance WHERE employeeId=? AND day=?").get(one, today) as
      { status: string } | undefined;
    return NextResponse.json({ employee: emp, today: mark?.status ?? null });
  }
  return NextResponse.json({ employees: listEmployees() });
}

// POST {name,...} | {loan...}
export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  try {
    if (body?.loan) {
      const parsed = z.object({
        loan: z.literal(true), employeeId: z.number().int(),
        amount: z.number().min(1).max(100000000), installment: z.number().min(1).max(100000000),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad loan" }, { status: 422 });
      return NextResponse.json({ ok: true, id: giveLoan(parsed.data.employeeId, parsed.data.amount, parsed.data.installment) });
    }
    const parsed = z.object({
      id: z.number().int().optional(), name: z.string().min(1).max(120),
      email: z.string().max(120).optional(), phone: z.string().max(20).optional(),
      dept: z.string().max(60).optional(), designation: z.string().max(60).optional(),
      base: z.number().min(0).max(100000000).optional(),
      allowances: z.number().min(0).max(100000000).optional(),
      deductions: z.number().min(0).max(100000000).optional(),
      joinedAt: z.string().max(10).optional(), active: z.boolean().optional(),
    }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "bad employee" }, { status: 422 });
    return NextResponse.json({ ok: true, id: saveEmployee(parsed.data) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
