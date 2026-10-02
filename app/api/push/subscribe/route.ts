import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/store";

const schema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({ p256dh: z.string().max(300), auth: z.string().max(100) }),
  label: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad subscription" }, { status: 422 });
  try {
    getDb().prepare("INSERT INTO PushSubscription (endpoint, p256dh, auth, label) VALUES (?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET label=excluded.label")
      .run(parsed.data.endpoint, parsed.data.keys.p256dh, parsed.data.keys.auth, String(parsed.data.label || "").slice(0, 120));
  } catch { /* ignore */ }
  return NextResponse.json({ ok: true });
}
