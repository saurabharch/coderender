import { NextResponse } from "next/server";
import { createLead } from "@/lib/leads";
import { getDb } from "@/lib/store";
import { runLocal } from "@/lib/jobs";
import { rateLimited, slowDown, clientKey } from "@/lib/rate-limit";
import { idemGet, idemSet } from "@/lib/abuse";
import { moderate } from "@/lib/moderate";
import { leadSchema } from "@/lib/lead-schema";
import { sessionUser } from "@/lib/auth";

// Team lead picker (client/owner mapping + agent tracking).
export async function GET(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") || "").slice(0, 60);
  const rows = (q
    ? getDb().prepare("SELECT id, name, phone, businessType, status FROM Lead WHERE name LIKE ? OR phone LIKE ? ORDER BY id DESC LIMIT 30").all(`%${q}%`, `%${q}%`)
    : getDb().prepare("SELECT id, name, phone, businessType, status FROM Lead ORDER BY id DESC LIMIT 30").all()) as
    { id: number; name: string; phone: string; businessType: string; status: string }[];
  return NextResponse.json({ leads: rows });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 422 });
  }
  const fp = (body as Record<string, unknown>).fingerprint as string | undefined;
  if (rateLimited(clientKey(fp, req), 30, 3600_000))
    return NextResponse.json(slowDown(), { status: 429 });
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid lead", issues: parsed.error.flatten() }, { status: 422 });
  if (moderate(`${parsed.data.name} ${parsed.data.message ?? ""}`).verdict === "block")
    return NextResponse.json({ error: "Invalid lead" }, { status: 422 });
  const idemKey = req.headers.get("idempotency-key");
  const replay = idemGet(idemKey);
  if (replay) return NextResponse.json({ ...JSON.parse(replay), replayed: true });
  const lead = createLead(parsed.data);
  if (parsed.data.source === "partner") {
    getDb().prepare("INSERT INTO PartnerRequest (name, phone, tier) VALUES (?,?,?)")
      .run(parsed.data.name, parsed.data.phone, "referrer");
  }
  runLocal("leadCreated", { leadId: lead.id }).catch(() => {});
  const out = { ok: true, id: lead.id };
  idemSet(idemKey, JSON.stringify(out));
  return NextResponse.json(out);
}
