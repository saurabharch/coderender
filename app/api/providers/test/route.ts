import { NextResponse } from "next/server";
import { z } from "zod";
import type { ProviderName } from "@/lib/providers";
import { sessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { isAdminEmail } = await import("@/lib/auth");
  if (!(user.role === "owner" || isAdminEmail(user.email)))
    return NextResponse.json({ error: "owner only" }, { status: 403 });
  const parsed = z.object({ name: z.enum(["smtp", "telegram", "whatsapp", "slack", "razorpay", "payu", "easebuzz", "stripe", "paytm", "wise", "autumn", "google", "media"]) }).safeParse(await req.json().catch(() => null));
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
      if (!cfg) return NextResponse.json({ ok: true, detail: "R2 unset — local storage; bg-removal runs on the imgly WASM engine (no keys)" });
      return NextResponse.json({
        ok: true,
        detail: `R2 ready (${cfg.source}, ${cfg.bucket}) · bg-removal imgly WASM engine (no keys)`,
      });
    }
    if (name === "razorpay") {
      const { razorpayCreds } = await import("@/lib/gateways");
      const cfg = razorpayCreds();
      if (!cfg.keyId || !cfg.keySecret)
        return NextResponse.json({ ok: false, detail: `save ${cfg.mode} key id + secret first (Payments tab)` });
      try {
        const res = await fetch("https://api.razorpay.com/v1/payments?count=1", {
          headers: { Authorization: `Basic ${Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString("base64")}` },
          signal: AbortSignal.timeout(20000),
        });
        return NextResponse.json(res.ok
          ? { ok: true, detail: `[${cfg.mode}] authenticated as ${cfg.keyId.slice(0, 12)}…` }
          : { ok: false, detail: `rejected (http ${res.status}) — check ${cfg.mode} keys` });
      } catch {
        return NextResponse.json({ ok: false, detail: "api unreachable" });
      }
    }
    if (name === "stripe") {
      const { stripeCreds } = await import("@/lib/gateways");
      const cfg = stripeCreds();
      if (!cfg.secret)
        return NextResponse.json({ ok: false, detail: `save ${cfg.mode} secret key first (Payments tab)` });
      try {
        const res = await fetch("https://api.stripe.com/v1/balance", {
          headers: { Authorization: `Bearer ${cfg.secret}` },
          signal: AbortSignal.timeout(20000),
        });
        return NextResponse.json(res.ok
          ? { ok: true, detail: `[${cfg.mode}] authenticated — publishable ${cfg.publishable.slice(0, 12)}…` }
          : { ok: false, detail: `rejected (http ${res.status}) — check ${cfg.mode} keys` });
      } catch {
        return NextResponse.json({ ok: false, detail: "api unreachable" });
      }
    }
    if (name === "paytm") {
      const { paytmCreds, paytmChecksum, paytmVerify } = await import("@/lib/gateways");
      const cfg = paytmCreds();
      if (!cfg.mid || !cfg.key)
        return NextResponse.json({ ok: false, detail: `save ${cfg.mode} MID + key first (Payments tab)` });
      // Checksum self-check (no money moves) + credential presence.
      const demo = { MID: cfg.mid, ORDERID: "test", TXN_AMOUNT: "1.00" };
      const sum = paytmChecksum(demo, cfg.key);
      const back = paytmVerify({ ...demo, CHECKSUMHASH: sum }, cfg.key);
      return NextResponse.json({
        ok: back,
        detail: back ? `[${cfg.mode}] MID ${cfg.mid} · checksum flow verifies (initiate at checkout)` : "checksum mismatch — check key",
      });
    }
    if (name === "wise") {
      const { wiseCreds, wiseHost } = await import("@/lib/gateways");
      const cfg = wiseCreds();
      if (!cfg.token || !cfg.profileId)
        return NextResponse.json({ ok: false, detail: `save ${cfg.mode} token + profile id first (Payments tab)` });
      try {
        const res = await fetch(`${wiseHost(cfg.mode)}/v1/profiles/${cfg.profileId}`, {
          headers: { Authorization: `Bearer ${cfg.token}` },
          signal: AbortSignal.timeout(20000),
        });
        return NextResponse.json(res.ok
          ? { ok: true, detail: `[${cfg.mode}] profile ${cfg.profileId} reachable (payout rail)` }
          : { ok: false, detail: `rejected (http ${res.status}) — check ${cfg.mode} token` });
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
    if (name === "autumn") {
      const { getProvider } = await import("@/lib/providers");
      const cfg = getProvider("autumn");
      const mode = cfg.AUTUMN_MODE === "live" ? "live" : "test";
      const secret = (mode === "live" ? cfg.AUTUMN_SECRET_KEY : cfg.AUTUMN_TEST_SECRET) || cfg.AUTUMN_SECRET_KEY || process.env.AUTUMN_API_KEY || "";
      if (!secret)
        return NextResponse.json({ ok: false, detail: `save ${mode} secret first (Payments tab → third-party biller)` });
      try {
        const res = await fetch("https://api.useautumn.com/v1/products", {
          headers: { Authorization: `Bearer ${secret}` },
          signal: AbortSignal.timeout(20000),
        });
        return NextResponse.json(res.ok
          ? { ok: true, detail: `[${mode}] connected — event mirror active (ledger stays truth)` }
          : { ok: false, detail: `rejected (http ${res.status}) — check ${mode} secret` });
      } catch {
        return NextResponse.json({ ok: false, detail: "api unreachable" });
      }
    }
    const { announce } = await import("@/lib/providers");
    const r = await announce("CodeRender provider test", `triggered by ${user.email}`);
    return NextResponse.json({ ok: r.slack === "sent", detail: String(r.slack) });
  } catch (e) {
    return NextResponse.json({ ok: false, detail: e instanceof Error ? e.message : "failed" });
  }
}
