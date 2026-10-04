import { getPref } from "./store";

export type WaProvider = "cloud-api" | "waha" | "off";

// Single switch — exactly one WhatsApp sender is ever live.
export function waActiveProvider(): WaProvider {
  const p = getPref("wa_provider", "cloud-api");
  return p === "waha" || p === "off" ? p : "cloud-api";
}

function base(): string {
  const url = process.env.WAHA_URL || getPref("waha_url", "");
  return url.replace(/\/$/, "");
}

async function resolvedBase(): Promise<string> {
  const b = base();
  if (b) return b;
  try {
    const { getProvider } = await import("./providers");
    return (getProvider("whatsapp").WAHA_URL || "").replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function wahaBase(): string {
  try {
    return base();
  } catch {
    return "";
  }
}

export function wahaConfigured(): boolean {
  return wahaBase().length > 8;
}

async function call(path: string, init?: RequestInit) {
  const b = await resolvedBase();
  if (!b) throw new Error("WAHA not configured (set WAHA_URL or waha_url pref)");
  const key = process.env.WAHA_API_KEY || "";
  const res = await fetch(`${b}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(key ? { "X-Api-Key": key } : {}),
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`waha http ${res.status}`);
  return res.json().catch(() => ({}));
}

// Session lifecycle: status → QR (data URL) → logout/clear.
export async function wahaStatus(session = "default"): Promise<{ status: string; me?: string }> {
  const d = (await call(`/api/sessions/${session}`)) as { status?: string; me?: { id?: string } };
  return { status: String(d.status ?? "unknown"), me: d.me?.id };
}

export async function wahaQR(session = "default"): Promise<{ qr: string | null; status: string }> {
  const st = await wahaStatus(session).catch(() => ({ status: "unknown" as string }));
  if (st.status.toUpperCase() !== "SCAN_QR_CODE") return { qr: null, status: st.status };
  const b = await resolvedBase();
  const key = process.env.WAHA_API_KEY || "";
  try {
    const res = await fetch(`${b}/api/sessions/${session}/qr`, {
      headers: key ? { "X-Api-Key": key } : {},
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return { qr: null, status: "SCAN_QR_CODE" };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) return { qr: null, status: "SCAN_QR_CODE" };
    const mime = res.headers.get("content-type") || "image/png";
    return { qr: `data:${mime};base64,${buf.toString("base64")}`, status: "SCAN_QR_CODE" };
  } catch {
    return { qr: null, status: "SCAN_QR_CODE" };
  }
}

export async function wahaStart(session = "default"): Promise<void> {
  await call(`/api/sessions/${session}/start`, { method: "POST", body: "{}" });
}

export async function wahaLogout(session = "default"): Promise<void> {
  await call(`/api/sessions/${session}/logout`, { method: "DELETE" }).catch(() => ({}));
  // Session data clear: stop + drop local session row.
  await call(`/api/sessions/${session}/stop`, { method: "POST", body: "{}" }).catch(() => ({}));
}

export async function wahaSendText(to: string, text: string, session = "default"): Promise<{ sent: boolean; via: string }> {
  const digits = String(to).replace(/\D/g, "");
  try {
    await call(`/api/sendText`, {
      method: "POST",
      body: JSON.stringify({ chatId: `${digits}@c.us`, text: text.slice(0, 4000), session }),
    });
    return { sent: true, via: "waha" };
  } catch {
    return { sent: false, via: "waha unreachable" };
  }
}
