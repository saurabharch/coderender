import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/store";
import { verifyApiKey, requireScope } from "@/lib/api-auth";

export async function POST(req: Request) {
  const ident = verifyApiKey(req.headers.get("authorization") ?? req.headers.get("x-api-key"));
  if (!requireScope(ident, "notify:write"))
    return NextResponse.json({ error: "valid API key with notify:write required" }, { status: 401 });
  const parsed = z.object({ title: z.string().min(2).max(120), body: z.string().max(2000).default(""), audience: z.string().max(20).default("team") })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad notification" }, { status: 422 });
  const r = getDb().prepare("INSERT INTO Notification (title, body, audience) VALUES (?,?,?)")
    .run(parsed.data.title, parsed.data.body, parsed.data.audience);
  return NextResponse.json({ ok: true, id: Number(r.lastInsertRowid) });
}
