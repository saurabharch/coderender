import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/store";
import { rateLimited, slowDown, clientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const parsed = z.object({ email: z.string().email().max(120), source: z.string().max(40).default("footer") })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad email" }, { status: 422 });
  if (rateLimited(`${clientKey(parsed.data.email, req)}|subscribe`, 5, 3600_000))
    return NextResponse.json(slowDown(), { status: 429 });
  try {
    getDb().prepare("INSERT INTO Subscriber (email, source) VALUES (?,?)")
      .run(parsed.data.email.toLowerCase(), parsed.data.source);
  } catch { /* duplicate = still ok */ }
  getDb().prepare("INSERT INTO Event (type, path, data) VALUES (?,?,?)")
    .run("form_submit", "/subscribe", parsed.data.email.toLowerCase());
  return NextResponse.json({ ok: true });
}
