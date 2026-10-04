import { getDb } from "./store";
import { sendMail } from "./mailer";
import { pushReady, pushTo } from "./push";

// Loop notifications for tickets: client + watchers + team, on the channels
// actually connected. Mail always attempted, push to labelled subs, WhatsApp
// via provider-or-link, Telegram via bot hook. Every send is audit-logged as
// a ticket event so the timeline shows who was told what.
export async function notifyTicket(ticketId: number, kind: "filed" | "filed-quiet" | "resolved" | "status"): Promise<Record<string, unknown>> {
  const t = getDb().prepare("SELECT * FROM Ticket WHERE id=?").get(ticketId) as
    { id: number; email: string; subject: string; status: string; assigneeEmail: string; phone: string } | undefined;
  if (!t) return { ok: false };
  const report: Record<string, unknown> = { ticket: ticketId, kind };
  const watchers = (getDb().prepare("SELECT email FROM TicketWatcher WHERE ticketId=?").all(ticketId) as { email: string }[])
    .map((r) => r.email);
  const { ADMIN_EMAILS } = await import("./auth");
  const mails = [...new Set([t.email, ...watchers, ...ADMIN_EMAILS].filter(Boolean))];
  const subject = kind === "resolved"
    ? `Resolved: ${t.subject} (#${t.id})`
    : kind === "status" ? `Update on ticket #${t.id}: ${t.status}` : `Ticket #${t.id}: ${t.subject}`;
  const html = `<p>Ticket <b>#${t.id}</b> — ${t.subject}</p><p>Status: <b>${t.status}</b>${t.assigneeEmail ? ` · Owner: ${t.assigneeEmail}` : ""}</p><p>Track it any time by replying to this email thread.</p>`;
  const sentMails: string[] = [];
  if (kind !== "filed-quiet") {
    for (const to of mails) {
      try {
        await sendMail(to, subject, html);
        sentMails.push(to);
      } catch { /* dev-preview still logs */ }
    }
  }
  report.mail = sentMails;
  let push = 0;
  if (pushReady() && kind !== "filed-quiet") {
    const subs = getDb().prepare("SELECT endpoint, p256dh, auth, label FROM PushSubscription").all() as
      { endpoint: string; p256dh: string; auth: string; label: string }[];
    for (const s of subs) {
      if (s.label && ![t.email, t.assigneeEmail, ...ADMIN_EMAILS].includes(s.label)) continue;
      if (!s.label && kind === "filed") continue; // unlabeled subs only get resolutions/updates
      if (await pushTo(s, subject, `Ticket #${t.id} · ${t.status}`).catch(() => false)) push++;
    }
  }
  report.push = push;
  const digits = (t.phone || "").replace(/\D/g, "");
  if ((/^\d{10}$/.test(digits) || /^91\d{10}$/.test(digits)) && kind !== "filed-quiet") {
    const phone = digits.length === 10 ? `91${digits}` : digits;
    const { sendWhatsApp } = await import("./providers");
    const wa = await sendWhatsApp(phone, `${subject} — reply STOP to opt out`);
    report.whatsapp = wa.sent ? "provider sent" : `link: ${wa.via}`;
  } else if (kind === "filed-quiet") {
    report.whatsapp = "skipped (quiet)";
  } else {
    report.whatsapp = "no phone on file";
  }
  if (kind !== "filed-quiet") {
    const { sendTelegram } = await import("./providers");
    const tg = await sendTelegram(`${subject} (#${t.id})`);
    report.telegram = tg.sent ? "sent" : tg.note;
  } else {
    report.telegram = "skipped (quiet)";
  }
  if (kind === "resolved") {
    const { announce } = await import("./providers");
    report.announce = await announce(`Ticket #${t.id} resolved`, t.subject);
  }
  try {
    getDb().prepare("INSERT INTO TicketEvent (ticketId, actor, kind, body) VALUES (?,?,?,?)").run(
      ticketId, "notify", "notify", JSON.stringify(report).slice(0, 1000));
  } catch { /* ignore */ }
  return report;
}
