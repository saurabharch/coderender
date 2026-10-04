import { createHmac, timingSafeEqual } from "node:crypto";
import { getDb } from "./store";
import { getProvider } from "./providers";

const GRAPH = "https://graph.facebook.com/v21.0";

export function waConfigured(): boolean {
  const cfg = getProvider("whatsapp");
  return !!(cfg.WHATSAPP_TOKEN && cfg.WHATSAPP_PHONE_ID);
}

// X-Hub-Signature-256 check (sha256=<hex> over the raw body).
export function validSignature(raw: string, sig: string | null): boolean {
  const secret = getProvider("whatsapp").WHATSAPP_APP_SECRET;
  if (!secret || !sig) return false;
  const want = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  try {
    return timingSafeEqual(Buffer.from(want), Buffer.from(sig));
  } catch {
    return false;
  }
}

export async function waSendText(to: string, text: string): Promise<{ sent: boolean; via: string }> {
  const cfg = getProvider("whatsapp");
  const digits = String(to).replace(/\D/g, "");
  if (cfg.WHATSAPP_TOKEN && cfg.WHATSAPP_PHONE_ID) {
    try {
      const res = await fetch(`${GRAPH}/${cfg.WHATSAPP_PHONE_ID}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: digits, type: "text", text: { body: text.slice(0, 4000) } }),
      });
      if (res.ok) return { sent: true, via: "cloud-api" };
      const err = await res.text().catch(() => "");
      return { sent: false, via: `cloud-api http ${res.status}: ${err.slice(0, 160)}` };
    } catch {
      return { sent: false, via: "network failed" };
    }
  }
  // Legacy generic provider, then wa.me link.
  const { sendWhatsApp } = await import("./providers");
  return sendWhatsApp(digits, text);
}

export async function waDebugToken(): Promise<{ ok: boolean; detail: string }> {
  const cfg = getProvider("whatsapp");
  if (!cfg.WHATSAPP_TOKEN) return { ok: false, detail: "save token first" };
  try {
    const appToken = cfg.WHATSAPP_APP_ID && cfg.WHATSAPP_APP_SECRET
      ? `${cfg.WHATSAPP_APP_ID}|${cfg.WHATSAPP_APP_SECRET}` : cfg.WHATSAPP_TOKEN;
    const res = await fetch(`${GRAPH}/debug_token?input_token=${encodeURIComponent(cfg.WHATSAPP_TOKEN)}&access_token=${encodeURIComponent(appToken)}`);
    const data = await res.json().catch(() => ({}));
    const d = (data as { data?: { is_valid?: boolean; expires_at?: number; scopes?: string[] } }).data;
    if (d?.is_valid) return { ok: true, detail: `valid${d.expires_at ? `, expires ${new Date(d.expires_at * 1000).toISOString().slice(0, 10)}` : ", never expires"} · scopes: ${(d.scopes ?? []).slice(0, 4).join(",")}` };
    return { ok: false, detail: JSON.stringify(data).slice(0, 200) };
  } catch {
    return { ok: false, detail: "graph unreachable" };
  }
}

// Inbound store: customer replies + delivery receipts.
export function recordInbound(input: {
  waId: string; from: string; body: string; kind: string; refId?: string;
}): void {
  getDb().prepare("INSERT INTO WaMessage (waId, sender, body, kind, refId) VALUES (?,?,?,?,?)").run(
    String(input.waId).slice(0, 60), String(input.from).slice(0, 40),
    String(input.body).slice(0, 2000), String(input.kind).slice(0, 20), String(input.refId ?? "").slice(0, 60));
}

export function recordReceipt(refId: string, status: string): void {
  if (!refId) return;
  getDb().prepare("INSERT INTO WaMessage (waId, sender, body, kind, refId) VALUES (?,?,?,?,?)").run(
    "", "meta", status, "receipt", refId.slice(0, 60));
}
