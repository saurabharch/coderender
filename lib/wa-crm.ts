import { getDb } from "./store";
import { isOptIn, isOptOut, sentimentScore, triageInbound } from "./wa-crm-core";

export interface Conversation {
  phone: string; name: string; stopped: number; sentiment: number; unread: number;
  lastAt: string; lastBody: string;
}

export function touchContact(phone: string, name?: string): void {
  const d = getDb();
  d.prepare("INSERT INTO WaContact (phone, name) VALUES (?,?) ON CONFLICT(phone) DO UPDATE SET lastAt=datetime('now')").run(phone, String(name ?? "").slice(0, 80));
}

export function listConversations(limit = 50): Conversation[] {
  const d = getDb();
  const rows = d.prepare("SELECT * FROM WaContact ORDER BY lastAt DESC LIMIT ?").all(limit) as unknown as
    { phone: string; name: string; stopped: number; sentiment: number; unread: number; lastAt: string }[];
  return rows.map((c) => {
    const last = d.prepare("SELECT body FROM WaMessage WHERE sender=? ORDER BY id DESC LIMIT 1").get(c.phone) as { body: string } | undefined;
    return { ...c, lastBody: (last?.body ?? "").slice(0, 120) };
  });
}

export function thread(phone: string, limit = 60): { id: number; body: string; kind: string; createdAt: string }[] {
  return getDb().prepare("SELECT id, body, kind, createdAt FROM WaMessage WHERE sender=? OR (kind='out' AND refId LIKE ?) ORDER BY id DESC LIMIT ?")
    .all(phone, `%${phone}%`, limit) as unknown as { id: number; body: string; kind: string; createdAt: string }[];
}

export function markRead(phone: string): void {
  getDb().prepare("UPDATE WaContact SET unread=0 WHERE phone=?").run(phone);
}

// Inbound pipeline shared by the webhook: contact, opt-outs, sentiment,
// single auto-ticket per angry contact. Returns what happened.
export async function ingestInbound(input: { from: string; body: string; waId: string; name?: string }): Promise<{ triage: string; ticketId?: number }> {
  const d = getDb();
  touchContact(input.from, input.name);
  const contact = d.prepare("SELECT stopped FROM WaContact WHERE phone=?").get(input.from) as { stopped: number };
  if (isOptOut(input.body)) {
    d.prepare("UPDATE WaContact SET stopped=1 WHERE phone=?").run(input.from);
    return { triage: "silent" };
  }
  if (isOptIn(input.body)) {
    d.prepare("UPDATE WaContact SET stopped=0 WHERE phone=?").run(input.from);
    return { triage: "silent" };
  }
  const score = sentimentScore(input.body);
  d.prepare("UPDATE WaContact SET sentiment=?, unread=unread+1, lastAt=datetime('now') WHERE phone=?").run(score, input.from);
  const triage = triageInbound(input.body, { stopped: !!contact.stopped });
  if (triage === "handoff") {
    const { fileTicket } = await import("./tickets");
    const dup = d.prepare(
      `SELECT t.id FROM Ticket t JOIN TicketEvent e ON e.ticketId=t.id
       WHERE t.email=? AND t.status IN ('open','pending') AND e.kind='wa-handoff'`).get(`wa:${input.from}`) as { id: number } | undefined;
    if (!dup) {
      const { id } = await fileTicket({
        email: `wa:${input.from}`, subject: `Angry WhatsApp from ${input.from}`,
        body: `Sentiment ${score}. Message: ${input.body.slice(0, 1000)}`, actor: "wa-triage",
        phone: input.from,
      });
      d.prepare("INSERT INTO TicketEvent (ticketId, actor, kind, body) VALUES (?,?,?,?)").run(id, "wa-triage", "wa-handoff", input.body.slice(0, 500));
      const { notifyTicket } = await import("./notify-ticket");
      await notifyTicket(id, "filed").catch(() => {});
      return { triage, ticketId: id };
    }
  }
  return { triage };
}

export async function replyTo(phone: string, text: string, actor: string): Promise<{ ok: boolean; detail: string }> {
  const d = getDb();
  const contact = d.prepare("SELECT stopped FROM WaContact WHERE phone=?").get(phone) as { stopped: number } | undefined;
  if (contact?.stopped) return { ok: false, detail: "contact opted out (STOP)" };
  const { waSendText } = await import("./whatsapp");
  const r = await waSendText(phone, text);
  if (!r.sent) return { ok: false, detail: r.via };
  d.prepare("INSERT INTO WaMessage (waId, sender, body, kind, refId) VALUES (?,?,?,?,?)").run(
    "", phone, text.slice(0, 2000), "out", `to:${phone}`);
  touchContact(phone);
  return { ok: true, detail: r.via };
}

export interface Template {
  id: number; name: string; body: string; lang: string; active: number;
}

export function listTemplates(): Template[] {
  return getDb().prepare("SELECT * FROM WaTemplate ORDER BY name LIMIT 100").all() as unknown as Template[];
}

export function saveTemplate(input: { id?: number; name: string; body: string; lang?: string }): number {
  const name = String(input.name ?? "").toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 60);
  if (!name || !String(input.body ?? "").trim()) throw new Error("name + body required");
  const d = getDb();
  if (input.id) {
    d.prepare("UPDATE WaTemplate SET name=?, body=?, lang=? WHERE id=?").run(
      name, String(input.body).slice(0, 2000), String(input.lang ?? "en").slice(0, 10), input.id);
    return input.id;
  }
  const r = d.prepare("INSERT INTO WaTemplate (name, body, lang) VALUES (?,?,?)").run(
    name, String(input.body).slice(0, 2000), String(input.lang ?? "en").slice(0, 10));
  return Number(r.lastInsertRowid);
}

export function deleteTemplate(id: number): void {
  getDb().prepare("DELETE FROM WaTemplate WHERE id=?").run(id);
}
