import { NextResponse } from "next/server";
import { z } from "zod";
import { recordPayment } from "@/lib/finance";
import { sessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({
    orderId: z.number().int(), amount: z.number().min(0).max(100000000),
    method: z.enum(["upi", "cash", "card"]).optional(), status: z.enum(["pending", "paid"]).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad payment" }, { status: 422 });
  const id = await recordPayment(parsed.data.orderId, parsed.data.amount, parsed.data.method ?? "upi", parsed.data.status ?? "pending");
  return NextResponse.json({ ok: true, id });
}
