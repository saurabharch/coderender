import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPayout } from "@/lib/partners";
import { partnerSession } from "@/lib/partner-auth";
import { partnerByEmail } from "@/lib/partners";

export async function POST(req: Request) {
  const email = await partnerSession();
  if (!email) return NextResponse.json({ error: "login required" }, { status: 401 });
  const p = partnerByEmail(email);
  if (!p) return NextResponse.json({ error: "no partner" }, { status: 404 });
  const parsed = z.object({ period: z.string().regex(/^\d{4}-\d{2}$/) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "period like YYYY-MM" }, { status: 422 });
  try {
    const id = requestPayout(p.id, parsed.data.period, `partner:${p.email}`);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
