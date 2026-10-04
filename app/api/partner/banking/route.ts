import { NextResponse } from "next/server";
import { z } from "zod";
import { setBanking } from "@/lib/partners";
import { partnerSession } from "@/lib/partner-auth";
import { partnerByEmail } from "@/lib/partners";

export async function POST(req: Request) {
  const email = await partnerSession();
  if (!email) return NextResponse.json({ error: "login required" }, { status: 401 });
  const p = partnerByEmail(email);
  if (!p) return NextResponse.json({ error: "no partner" }, { status: 404 });
  const parsed = z.object({
    bankName: z.string().max(80).optional(), accountNo: z.string().max(30).optional(),
    ifsc: z.string().max(20).optional(), upi: z.string().max(60).optional(),
  }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad details" }, { status: 422 });
  setBanking(p.id, parsed.data);
  return NextResponse.json({ ok: true });
}
