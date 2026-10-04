import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/store";
import { rateLimited, slowDown, clientKey } from "@/lib/rate-limit";
import { moderate } from "@/lib/moderate";

const schema = z.object({
  name: z.string().max(80).optional(),
  email: z.string().email().max(120),
  subject: z.string().min(4).max(160),
  message: z.string().min(10).max(4000),
});

export async function POST(req: Request) {
  if (rateLimited(`${clientKey(undefined, req)}|ticket`, 5, 3600_000))
    return NextResponse.json(slowDown(), { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad ticket" }, { status: 422 });
  const d = parsed.data;
  if (moderate(`${d.subject} ${d.message}`).verdict === "block")
    return NextResponse.json({ error: "bad ticket" }, { status: 422 });
  const r = getDb().prepare("INSERT INTO Ticket (email, subject, body, status) VALUES (?,?,?,?)").run(
    d.email, `[web] ${d.subject}`.slice(0, 160), `${d.name ? `From: ${d.name}\n` : ""}${d.message}`.slice(0, 4000), "open");
  getDb().prepare("INSERT INTO Notification (title, body, audience) VALUES (?,?,?)").run(
    `Ticket: ${d.subject}`.slice(0, 160), `from ${d.email}`, "team");
  return NextResponse.json({ ok: true, id: Number(r.lastInsertRowid) });
}
