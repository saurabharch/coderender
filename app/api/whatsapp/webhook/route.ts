import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers";
import { recordInbound, recordReceipt, validSignature } from "@/lib/whatsapp";
import { getDb } from "@/lib/store";

// Meta webhook: GET verifies (hub.verify_token match → hub.challenge),
// POST receives messages + delivery receipts (signature-checked).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge") ?? "";
  const want = getProvider("whatsapp").WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && want && token === want) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

export async function POST(req: Request) {
  const raw = await req.text().catch(() => "");
  if (!validSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "bad signature" }, { status: 403 });
  }
  let payload: unknown = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 422 });
  }
  const entries = (payload as { entry?: { changes?: { value?: Record<string, unknown> }[] }[] }).entry ?? [];
  let inbound = 0;
  for (const e of entries) {
    for (const c of e.changes ?? []) {
      const v = c.value ?? {};
      const messages = (v.messages ?? []) as { id: string; from: string; timestamp?: string; text?: { body: string }; type?: string }[];
      for (const m of messages) {
        recordInbound({
          waId: m.id ?? "", from: m.from ?? "",
          body: m.text?.body ?? `[${m.type ?? "media"}]`, kind: "in", refId: m.id ?? "",
        });
        // CRM pipeline: contacts, STOP/START, sentiment → auto-ticket.
        try {
          const { ingestInbound } = await import("@/lib/wa-crm");
          await ingestInbound({ from: m.from ?? "", body: m.text?.body ?? "", waId: m.id ?? "" });
        } catch { /* triage never breaks ingest */ }
        inbound++;
      }
      const statuses = (v.statuses ?? []) as { id?: string; status?: string }[];
      for (const s of statuses) {
        if (s.id && s.status) recordReceipt(s.id, s.status);
      }
    }
  }
  if (inbound > 0) {
    getDb().prepare("INSERT INTO Notification (title, body, audience, kind, target) VALUES (?,?,?,?,?)").run(
      `WhatsApp: ${inbound} new message(s)`, "replies landed — answer from inbox", "team", "whatsapp", "team");
  }
  return NextResponse.json({ ok: true, inbound });
}
