import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/store";

const schema = z.object({
  type: z.enum(["page_view", "click", "form_submit", "lead"]),
  path: z.string().max(300).default("/"),
  fingerprint: z.string().max(80).optional(),
  data: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad event" }, { status: 422 });
  const e = parsed.data;
  getDb().prepare("INSERT INTO Event (type, path, fingerprint, data) VALUES (?,?,?,?)")
    .run(e.type, e.path, e.fingerprint ?? null, e.data ?? null);
  return NextResponse.json({ ok: true });
}
