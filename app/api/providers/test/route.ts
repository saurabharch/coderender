import { NextResponse } from "next/server";
import { z } from "zod";
import type { ProviderName } from "@/lib/providers";
import { sessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const parsed = z.object({ name: z.enum(["smtp", "telegram", "whatsapp", "slack", "razorpay", "payu", "easebuzz", "google", "media"]) }).safeParse(await req.json().catch(() => null));
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
    if (name === "google") {
      const { getProvider } = await import("@/lib/providers");
      const cfg = getProvider("google");
      const fromVault = !!(cfg.GOOGLE_CLIENT_ID && cfg.GOOGLE_CLIENT_SECRET);
      const fromEnv = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
      if (!fromVault && !fromEnv)
        return NextResponse.json({ ok: false, detail: "save client ID + secret first (dashboard or env)" });
      const { googleStatus } = await import("@/lib/google");
      const st = googleStatus(user.email);
      return NextResponse.json({
        ok: true,
        detail: `keys from ${fromVault ? "dashboard" : "env"} · ${st.connected ? `connected (${st.calendarId})` : "not connected — use Connect on /admin/google"}`,
      });
    }
    if (name === "whatsapp") {
      const { waDebugToken } = await import("@/lib/whatsapp");
      const r = await waDebugToken();
      return NextResponse.json({ ok: r.ok, detail: r.detail });
    }
    if (name === "media") {
      const { r2Config } = await import("@/lib/r2");
      const cfg = r2Config();
      if (!cfg) return NextResponse.json({ ok: false, detail: "save R2 keys first (dashboard Providers → media)" });
      return NextResponse.json({ ok: true, detail: `R2 ready (${cfg.source}) — uploads go to ${cfg.bucket}` });
    }
    if (name === "razorpay") {
      const { getProvider } = await import("@/lib/providers");
      const cfg = getProvider("razorpay");
      if (!cfg.RAZORPAY_KEY_ID || !cfg.RAZORPAY_KEY_SECRET)
        return NextResponse.json({ ok: false, detail: "save key id + secret first" });
      try {
        const res = await fetch("https://api.razorpay.com/v1/payments?count=1", {
          headers: { Authorization: `Basic ${Buffer.from(`${cfg.RAZORPAY_KEY_ID}:${cfg.RAZORPAY_KEY_SECRET}`).toString("base64")}` },
          signal: AbortSignal.timeout(20000),
        });
        return NextResponse.json(res.ok
          ? { ok: true, detail: `authenticated as ${cfg.RAZORPAY_KEY_ID.slice(0, 12)}…` }
          : { ok: false, detail: `rejected (http ${res.status}) — check keys` });
      } catch {
        return NextResponse.json({ ok: false, detail: "api unreachable" });
      }
    }
    if (name === "payu" || name === "easebuzz") {
      const { gatewayStatus } = await import("@/lib/gateways");
      const st = gatewayStatus()[name];
      if (!st.configured) return NextResponse.json({ ok: false, detail: "save key + salt first" });
      // Hash round-trip self-check (no money moves).
      const { payuRequestHash, payuVerifyResponse, easebuzzRequestHash, easebuzzVerifyResponse } = await import("@/lib/gateways");
      const demo = {
        key: "k", txnid: "t1", amount: "100.00", productinfo: "test",
        firstname: "T", email: "t@t.in", salt: "s", status: "success", hash: "",
      };
      if (name === "payu") {
        const h = payuRequestHash({ ...demo });
        const back = payuVerifyResponse({ ...demo, hash: payuRequestHash({ ...demo }) });
        void h;
        return NextResponse.json({ ok: back, detail: back ? "hash flows verify (keys stored)" : "hash mismatch" });
      }
      const h = easebuzzRequestHash({ ...demo, surl: "s", furl: "f" });
      const back = easebuzzVerifyResponse({ ...demo, hash: easebuzzRequestHash({ ...demo, surl: "s", furl: "f" }) });
      void h;
      return NextResponse.json({ ok: back, detail: back ? "hash flows verify (keys stored)" : "hash mismatch" });
    }
    const { announce } = await import("@/lib/providers");
    const r = await announce("CodeRender provider test", `triggered by ${user.email}`);
    return NextResponse.json({ ok: r.slack === "sent", detail: String(r.slack) });
  } catch (e) {
    return NextResponse.json({ ok: false, detail: e instanceof Error ? e.message : "failed" });
  }
}
