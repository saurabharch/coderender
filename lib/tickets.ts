import { getDb } from "./store";
import { moderate } from "./moderate";

export type TicketStatus = "open" | "pending" | "resolved" | "closed" | "spam";

export interface Ticket {
  id: number; email: string; subject: string; body: string; status: string;
  assigneeEmail: string; escalated: number; phone: string; createdAt: string;
}

export function logEvent(ticketId: number, actor: string, kind: string, body: string) {
  getDb().prepare("INSERT INTO TicketEvent (ticketId, actor, kind, body) VALUES (?,?,?,?)").run(
    ticketId, actor.slice(0, 120), kind.slice(0, 30), body.slice(0, 2000));
}

export function watchers(ticketId: number): string[] {
  return (getDb().prepare("SELECT email FROM TicketWatcher WHERE ticketId=?").all(ticketId) as { email: string }[])
    .map((r) => r.email);
}

export function watch(ticketId: number, email: string) {
  const e = String(email || "").slice(0, 120);
  if (!e) return;
  getDb().prepare("INSERT INTO TicketWatcher (ticketId, email) VALUES (?,?) ON CONFLICT DO NOTHING").run(ticketId, e);
}

// Abuse layer: blocks become auto-hidden spam, warns stay pending-masked.
export async function fileTicket(input: {
  email: string; subject: string; body: string; name?: string; actor?: string; phone?: string;
}): Promise<{ id: number; status: TicketStatus }> {
  const email = String(input.email ?? "").slice(0, 120);
  const subject = String(input.subject ?? "").slice(0, 160);
  const body = String(input.body ?? "").slice(0, 4000);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("bad email");
  if (subject.trim().length < 4 || body.trim().length < 10) throw new Error("too short");
  const mod = moderate(`${subject} ${body}`);
  const status: TicketStatus = mod.verdict === "block" ? "spam" : "open";
  const phone = String(input.phone ?? "").slice(0, 20);
  const r = getDb().prepare("INSERT INTO Ticket (email, subject, body, status, phone) VALUES (?,?,?,?,?)").run(email, subject, body, status, phone);
  const id = Number(r.lastInsertRowid);
  watch(id, email);
  logEvent(id, input.actor || email, "created", `Filed (${status})${mod.reasons.length ? `: ${mod.reasons.join(", ")}` : ""}`);
  const { notifyTicket } = await import("./notify-ticket");
  await notifyTicket(id, status === "spam" ? "filed-quiet" : "filed").catch(() => {});
  return { id, status };
}

export function getTicket(id: number): (Ticket & { events: { actor: string; kind: string; body: string; createdAt: string }[]; attachments: { id: number; filename: string; mime: string; size: number; status: string }[] }) | null {
  const t = getDb().prepare("SELECT * FROM Ticket WHERE id=?").get(id) as Ticket | undefined;
  if (!t) return null;
  const events = getDb().prepare("SELECT actor, kind, body, createdAt FROM TicketEvent WHERE ticketId=? ORDER BY id").all(id) as
    { actor: string; kind: string; body: string; createdAt: string }[];
  const attachments = getDb().prepare("SELECT id, filename, mime, size, status FROM TicketAttachment WHERE ticketId=? ORDER BY id").all(id) as
    { id: number; filename: string; mime: string; size: number; status: string }[];
  return { ...t, events, attachments };
}

export function listTickets(status?: string, limit = 100): Ticket[] {
  const d = getDb();
  const rows = (status
    ? d.prepare("SELECT * FROM Ticket WHERE status=? ORDER BY id DESC LIMIT ?").all(status, limit)
    : d.prepare("SELECT * FROM Ticket ORDER BY id DESC LIMIT ?").all(limit)) as unknown as Ticket[];
  return rows;
}

export async function setTicketStatus(id: number, status: TicketStatus, actor: string, note?: string): Promise<void> {
  const cur = getDb().prepare("SELECT status FROM Ticket WHERE id=?").get(id) as { status: string } | undefined;
  if (!cur) throw new Error("not found");
  getDb().prepare("UPDATE Ticket SET status=? WHERE id=?").run(status, id);
  logEvent(id, actor, "status", `${cur.status} → ${status}${note ? `: ${note}` : ""}`);
  const { notifyTicket } = await import("./notify-ticket");
  await notifyTicket(id, status === "resolved" ? "resolved" : "status").catch(() => {});
}

export async function assignTicket(id: number, email: string, actor: string): Promise<void> {
  getDb().prepare("UPDATE Ticket SET assigneeEmail=? WHERE id=?").run(String(email).slice(0, 120), id);
  watch(id, email);
  logEvent(id, actor, "assign", `Assigned to ${email || "nobody"}`);
}

export async function resolveTicket(id: number, actor: string, resolution: string): Promise<void> {
  const note = String(resolution ?? "").slice(0, 2000);
  if (note.trim().length < 4) throw new Error("resolution too short");
  logEvent(id, actor, "resolution", note);
  await setTicketStatus(id, "resolved", actor);
}

// Adjustable SLA (admin/settings prefs, hours/days): stale opens escalate,
// long-resolved auto-close. Runs on the scheduler tick.
export async function slaTick(): Promise<string[]> {
  const d = getDb();
  const out: string[] = [];
  const ackH = Number((d.prepare("SELECT value FROM Preference WHERE key='sla_ack_hours'").get() as { value: string } | undefined)?.value ?? 24) || 24;
  const closeD = Number((d.prepare("SELECT value FROM Preference WHERE key='sla_close_days'").get() as { value: string } | undefined)?.value ?? 14) || 14;
  const stale = d.prepare(
    `SELECT id FROM Ticket WHERE status='open' AND escalated=0 AND createdAt < datetime('now', ?)`).all(`-${Math.max(1, Math.round(ackH))} hours`) as { id: number }[];
  for (const s of stale) {
    d.prepare("UPDATE Ticket SET escalated=1 WHERE id=?").run(s.id);
    logEvent(s.id, "sla", "escalate", `No reply within ${Math.round(ackH)}h — escalated`);
    out.push(`#${s.id} escalated`);
  }
  const old = d.prepare(
    `SELECT id FROM Ticket WHERE status='resolved' AND createdAt < datetime('now', ?)`).all(`-${Math.max(1, Math.round(closeD))} days`) as { id: number }[];
  for (const o of old) {
    d.prepare("UPDATE Ticket SET status='closed' WHERE id=?").run(o.id);
    logEvent(o.id, "sla", "status", "resolved → closed (auto)");
    out.push(`#${o.id} auto-closed`);
  }
  return out;
}
