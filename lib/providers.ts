import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getDb } from "./store";

// Provider credentials: AES-256-GCM envelope, key from PROVIDER_KEY (or the
// app secret fallback). Values render masked; only presence is ever logged.
function key(): Buffer {
  return createHash("sha256").update(process.env.PROVIDER_KEY || process.env.CAPTCHA_SECRET || "coderender-dev").digest();
}

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `${iv.toString("hex")}:${c.getAuthTag().toString("hex")}:${enc.toString("hex")}`;
}

export function unseal(packed: string): string {
  const [iv, tag, data] = String(packed).split(":");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "hex"));
  d.setAuthTag(Buffer.from(tag, "hex"));
  return Buffer.concat([d.update(Buffer.from(data, "hex")), d.final()]).toString("utf8");
}

export type ProviderName = "smtp" | "telegram" | "whatsapp" | "slack" | "razorpay" | "payu" | "easebuzz" | "google" | "media" | "languagetool";

export const PROVIDER_FIELDS: Record<ProviderName, { label: string; hint: string }[]> = {
  smtp: [
    { label: "SMTP_URL", hint: "smtp://user:pass@host:587" },
    { label: "MAIL_FROM", hint: "CodeRender <no-reply@coderender.in>" },
  ],
  telegram: [
    { label: "TELEGRAM_BOT_TOKEN", hint: "123:ABC from @BotFather" },
    { label: "TELEGRAM_TEAM_CHAT_ID", hint: "team group/channel id" },
  ],
  whatsapp: [
    { label: "WHATSAPP_TOKEN", hint: "Permanent access token (System Users)" },
    { label: "WHATSAPP_PHONE_ID", hint: "Phone Number ID (API Setup)" },
    { label: "WHATSAPP_WABA_ID", hint: "WhatsApp Business Account ID" },
    { label: "WHATSAPP_APP_ID", hint: "App ID (App Settings → Basic)" },
    { label: "WHATSAPP_APP_SECRET", hint: "App secret (webhook signatures)" },
    { label: "WHATSAPP_VERIFY_TOKEN", hint: "Your secret string (e.g. MyCustomSecureToken123!)" },
    { label: "WAHA_URL", hint: "WAHA host (e.g. http://waha:3000) — alternative sender" },
    { label: "WAHA_API_KEY", hint: "WAHA API key (if set)" },
    { label: "WHATSAPP_API_URL", hint: "Legacy: generic provider endpoint (fallback)" },
    { label: "WHATSAPP_API_TOKEN", hint: "Legacy: generic provider token (fallback)" },
  ],
  slack: [
    { label: "SLACK_WEBHOOK_URL", hint: "incoming webhook URL" },
  ],
  razorpay: [
    { label: "RAZORPAY_KEY_ID", hint: "rzp_live_* / rzp_test_*" },
    { label: "RAZORPAY_KEY_SECRET", hint: "key secret" },
    { label: "RAZORPAY_WEBHOOK_SECRET", hint: "webhook secret (Dashboard → Webhooks)" },
  ],
  payu: [
    { label: "PAYU_MERCHANT_KEY", hint: "merchant key" },
    { label: "PAYU_MERCHANT_SALT", hint: "merchant salt" },
  ],
  easebuzz: [
    { label: "EASEBUZZ_MERCHANT_KEY", hint: "merchant key" },
    { label: "EASEBUZZ_SALT", hint: "salt" },
  ],
  google: [
    { label: "GOOGLE_CLIENT_ID", hint: "Google Cloud → APIs & Services → Credentials → OAuth client ID" },
    { label: "GOOGLE_CLIENT_SECRET", hint: "matching client secret" },
  ],
  languagetool: [
    { label: "LT_URL", hint: "https://api.languagetool.org/v2 (self-hosted URL works too)" },
    { label: "LT_KEY", hint: "optional premium key (public tier needs none)" },
  ],
  media: [
    { label: "R2_ACCOUNT_ID", hint: "Cloudflare account ID" },
    { label: "R2_ACCESS_KEY_ID", hint: "R2 API token key" },
    { label: "R2_SECRET_ACCESS_KEY", hint: "R2 API token secret" },
    { label: "R2_BUCKET", hint: "bucket name (e.g. coderender-media)" },
    { label: "R2_PUBLIC_URL", hint: "public base (custom domain or r2.dev URL)" },
  ],
};

export function getProvider(name: ProviderName): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of PROVIDER_FIELDS[name]) {
    const env = process.env[f.label];
    if (env) out[f.label] = env;
  }
  try {
    const row = getDb().prepare("SELECT payload FROM ProviderCred WHERE name=?").get(name) as { payload: string } | undefined;
    if (row?.payload) {
      const obj = JSON.parse(unseal(row.payload)) as Record<string, string>;
      for (const [k, v] of Object.entries(obj)) if (v) out[k] = v;
    }
  } catch { /* fall back to env */ }
  return out;
}

export function providerStatus(): Record<ProviderName, { fields: string[]; set: string[]; source: string }> {
  const out = {} as Record<ProviderName, { fields: string[]; set: string[]; source: string }>;
  for (const name of Object.keys(PROVIDER_FIELDS) as ProviderName[]) {
    const cfg = getProvider(name);
    const set = PROVIDER_FIELDS[name].map((f) => f.label).filter((k) => cfg[k]);
    const hasDb = (() => {
      try {
        return !!((getDb().prepare("SELECT payload FROM ProviderCred WHERE name=?").get(name) as { payload: string } | undefined)?.payload);
      } catch { return false; }
    })();
    out[name] = {
      fields: PROVIDER_FIELDS[name].map((f) => f.label), set,
      source: hasDb ? "dashboard" : set.length ? "env" : "missing",
    };
  }
  return out;
}

export function saveProvider(name: ProviderName, values: Record<string, string>): void {
  const clean: Record<string, string> = {};
  for (const f of PROVIDER_FIELDS[name]) {
    const v = String(values[f.label] ?? "").slice(0, 2000);
    if (v) clean[f.label] = v;
  }
  getDb().prepare("INSERT INTO ProviderCred (name, payload) VALUES (?,?) ON CONFLICT(name) DO UPDATE SET payload=excluded.payload, updatedAt=datetime('now')")
    .run(name, seal(JSON.stringify(clean)));
}

export function clearProvider(name: ProviderName): void {
  getDb().prepare("DELETE FROM ProviderCred WHERE name=?").run(name);
}

// ---- senders (single chokepoint per channel) ----

export function smtpConfig(): { url: string; from: string } {
  const cfg = getProvider("smtp");
  return {
    url: cfg.SMTP_URL || process.env.SMTP_URL || "",
    from: cfg.MAIL_FROM || process.env.MAIL_FROM || "CodeRender <no-reply@coderender.in>",
  };
}

export async function sendTelegram(text: string, chatId?: string): Promise<{ sent: boolean; note: string }> {
  const cfg = getProvider("telegram");
  const token = cfg.TELEGRAM_BOT_TOKEN;
  const chat = chatId || cfg.TELEGRAM_TEAM_CHAT_ID;
  if (!token || !chat) return { sent: false, note: "needs bot token + chat id" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: text.slice(0, 3500) }),
    });
    return res.ok ? { sent: true, note: "sent" } : { sent: false, note: `http ${res.status}` };
  } catch {
    return { sent: false, note: "network failed" };
  }
}

export async function sendWhatsApp(phone: string, text: string): Promise<{ sent: boolean; via: string }> {
  const { waActiveProvider } = await import("./waha");
  const active = waActiveProvider();
  if (active === "off") return { sent: false, via: "whatsapp off (kill switch)" };
  if (active === "waha") {
    const { wahaSendText } = await import("./waha");
    return wahaSendText(phone, text);
  }
  const { waSendText, waConfigured } = await import("./whatsapp");
  if (waConfigured()) return waSendText(phone, text);
  const cfg = getProvider("whatsapp");
  const url = cfg.WHATSAPP_API_URL;
  const token = cfg.WHATSAPP_API_TOKEN;
  const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(text.slice(0, 500))}`;
  if (!url || !token) return { sent: false, via: waLink };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to: phone, text: text.slice(0, 2000) }),
    });
    if (res.ok) return { sent: true, via: "provider" };
  } catch { /* fall through */ }
  return { sent: false, via: waLink };
}

export async function announce(title: string, body: string): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  const cfg = getProvider("slack");
  if (cfg.SLACK_WEBHOOK_URL) {
    try {
      const res = await fetch(cfg.SLACK_WEBHOOK_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `*${title}*\n${body.slice(0, 2000)}` }),
      });
      out.slack = res.ok ? "sent" : `http ${res.status}`;
    } catch {
      out.slack = "failed";
    }
  } else {
    out.slack = "no webhook";
  }
  try {
    const tg = await sendTelegram(`${title}\n${body.slice(0, 1000)}`);
    out.telegram = tg.sent ? "sent" : tg.note;
  } catch {
    out.telegram = "failed";
  }
  return out;
}
