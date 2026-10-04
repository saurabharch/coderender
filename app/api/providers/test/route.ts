import { NextResponse } from "next/server";
import { z } from "zod";
import type { ProviderName } from "@/lib/providers";
import { sessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({ name: z.enum(["smtp", "telegram", "whatsapp", "slack"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad provider" }, { status: 422 });
  const name: ProviderName = parsed.data.name;
  try {
    if (name === "smtp") {
      const { sendMail } = await import("@/lib/mailer");
      const r = await sendMail(user.email, "CodeRender provider test", "<p>SMTP works — this is a test.</p>");
      return NextResponse.json({ ok: true, detail: r.preview ? `preview: ${r.preview}` : "sent" });
    }
    if (name === "telegram") {
      const { sendTelegram } = await import("@/lib/providers");
      const r = await sendTelegram(`CodeRender test from ${user.email}`);
      return NextResponse.json({ ok: r.sent, detail: r.note });
    }
    if (name === "whatsapp") {
      const { waDebugToken } = await import("@/lib/whatsapp");
      const r = await waDebugToken();
      return NextResponse.json({ ok: r.ok, detail: r.detail });
    }
    const { announce } = await import("@/lib/providers");
    const r = await announce("CodeRender provider test", `triggered by ${user.email}`);
    return NextResponse.json({ ok: r.slack === "sent", detail: String(r.slack) });
  } catch (e) {
    return NextResponse.json({ ok: false, detail: e instanceof Error ? e.message : "failed" });
  }
}
