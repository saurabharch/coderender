import { NextResponse } from "next/server";
import { z } from "zod";
import { fileTicket } from "@/lib/tickets";
import { rateLimited, slowDown, clientKey } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().max(80).optional(),
  email: z.string().email().max(120),
  phone: z.string().max(20).optional(),
  subject: z.string().min(4).max(160),
  message: z.string().min(10).max(4000),
});

export async function POST(req: Request) {
  if (rateLimited(`${clientKey(undefined, req)}|ticket`, 5, 3600_000))
    return NextResponse.json(slowDown(), { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad ticket" }, { status: 422 });
  const d = parsed.data;
  try {
    // Abuse layer inside: blocks become auto-hidden spam (shadow path).
    const { id, status } = await fileTicket({
      email: d.email, subject: d.subject,
      body: `${d.name ? `From: ${d.name}\n` : ""}${d.message}`,
      name: d.name, phone: d.phone, actor: "web",
    });
    if (status === "spam") return NextResponse.json({ ok: true, id });
    return NextResponse.json({ ok: true, id });
  } catch {
    return NextResponse.json({ error: "bad ticket" }, { status: 422 });
  }
}
