import { NextResponse } from "next/server";
import { z } from "zod";
import { setGoal } from "@/lib/partners";
import { partnerSession } from "@/lib/partner-auth";
import { partnerByEmail } from "@/lib/partners";

export async function POST(req: Request) {
  const email = await partnerSession();
  if (!email) return NextResponse.json({ error: "login required" }, { status: 401 });
  const p = partnerByEmail(email);
  if (!p) return NextResponse.json({ error: "no partner" }, { status: 404 });
  const parsed = z.object({
    kind: z.enum(["day", "week", "month", "year"]),
    period: z.enum(["clients", "revenue"]),
    target: z.number().min(1).max(10000000),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad goal" }, { status: 422 });
  setGoal(p.id, parsed.data.kind, parsed.data.period, parsed.data.target);
  return NextResponse.json({ ok: true });
}
