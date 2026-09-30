import { NextResponse } from "next/server";
import { createLead } from "@/lib/leads";
import { getDb } from "@/lib/store";
import { leadSchema } from "@/lib/lead-schema";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 422 });
  }
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid lead", issues: parsed.error.flatten() }, { status: 422 });
  const lead = createLead(parsed.data);
  if (parsed.data.source === "partner") {
    getDb().prepare("INSERT INTO PartnerRequest (name, phone, tier) VALUES (?,?,?)")
      .run(parsed.data.name, parsed.data.phone, "referrer");
  }
  return NextResponse.json({ ok: true, id: lead.id });
}
