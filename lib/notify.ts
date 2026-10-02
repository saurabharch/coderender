import { getDb } from "./store";
import { pushReady, pushTo } from "./push";
import { sendMail } from "./mailer";

export interface Meeting {
  id: number; name: string; contact: string; mode: string; slot: string; status: string;
}

function contactEmail(contact: string): string {
  const m = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.exec(contact || "");
  return m ? m[0].slice(0, 120) : "";
}

function contactPhone(contact: string): string {
  const digits = (contact || "").replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length < 10) return "";
  return digits.length === 10 ? `91${digits}` : digits;
}

export function waLink(phone: string, text: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text.slice(0, 500))}`;
}

async function sendWhatsApp(phone: string, text: string): Promise<{ sent: boolean; via: string }> {
  const url = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_API_TOKEN;
  if (url && token) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: phone, text }),
      });
      if (res.ok) return { sent: true, via: "provider" };
    } catch { /* fall through to link */ }
  }
  return { sent: false, via: waLink(phone, text) };
}

async function sendTelegram(text: string): Promise<{ sent: boolean; note: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_TEAM_CHAT_ID;
  if (token && chatId) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 3000) }),
      });
      if (res.ok) return { sent: true, note: "team chat" };
    } catch { /* fall through */ }
  }
  return { sent: false, note: "needs TELEGRAM_BOT_TOKEN + chat id (participant chat_ids are captured on /start)" };
}

export interface NotifyReport {
  mail: string[];
  push: number;
  whatsapp: string;
  telegram: string;
}

// Reschedule notify: ONLY involved participants (client contact + team),
// never a broadcast. Returns a per-channel report for the audit trail.
export async function notifyReschedule(m: Meeting, oldSlot: string, actor: string): Promise<NotifyReport> {
  const report: NotifyReport = { mail: [], push: 0, whatsapp: "skipped", telegram: "skipped" };
  const when = `${m.slot} (IST), 20 minutes, ${m.mode}`;
  const text = `Hi ${m.name}! Your CodeRender meeting moved: ${oldSlot || "unscheduled"} → ${when}. Join details follow on your contact. — Team CodeRender`;
  const html = `<p>Hi ${m.name},</p><p>Your meeting was rescheduled by ${actor}:</p><p><b>Was:</b> ${oldSlot || "unscheduled"}<br><b>Now:</b> ${when}</p><p>Mode: ${m.mode}</p>`;

  const email = contactEmail(m.contact);
  const targets = [...new Set([email, ...(await import("./auth")).ADMIN_EMAILS].filter(Boolean))];
  for (const to of targets) {
    try {
      await sendMail(to, `Meeting rescheduled — ${m.slot}`, html);
      report.mail.push(to);
    } catch { /* dev-preview still logs */ }
  }

  if (pushReady()) {
    const subs = getDb().prepare("SELECT endpoint, p256dh, auth, label FROM PushSubscription").all() as
      { endpoint: string; p256dh: string; auth: string; label: string }[];
    const involved = subs.filter((s) =>
      !s.label || s.label === m.contact || s.label === email || (s.label.includes("@") && targets.includes(s.label)));
    for (const s of involved) {
      if (await pushTo(s, "Meeting rescheduled", `${m.slot} · ${m.mode}`).catch(() => false)) report.push++;
    }
  }

  const phone = contactPhone(m.contact);
  if (phone) {
    const wa = await sendWhatsApp(phone, text);
    report.whatsapp = wa.sent ? "provider sent" : `link: ${wa.via}`;
  }
  const tg = await sendTelegram(`🔁 Rescheduled #${m.id} ${m.name}: ${oldSlot || "—"} → ${m.slot} (${m.mode}) by ${actor}`);
  report.telegram = tg.sent ? `sent (${tg.note})` : tg.note;

  getDb().prepare("INSERT INTO Notification (title, body, audience) VALUES (?,?,?)").run(
    `Rescheduled #${m.id} → ${m.slot}`,
    `${m.name} · mail:[${report.mail.join(",")}] push:${report.push} wa:${report.whatsapp.slice(0, 120)} tg:${report.telegram.slice(0, 120)}`,
    "team");
  return report;
}

// Shared reschedule primitive (admin UI, API, and bot all funnel here).
export async function rescheduleMeeting(id: number, slot: string, actor: string): Promise<{ meeting: Meeting; oldSlot: string; report: NotifyReport }> {
  const cur = getDb().prepare("SELECT * FROM Appointment WHERE id=?").get(id) as Meeting | undefined;
  if (!cur) throw new Error("not found");
  const clean = String(slot ?? "").slice(0, 120);
  if (clean.length < 3) throw new Error("bad slot");
  const oldSlot = cur.slot;
  getDb().prepare("UPDATE Appointment SET slot=?, status='confirmed' WHERE id=?").run(clean, id);
  const meeting = { ...cur, slot: clean, status: "confirmed" };
  const report = await notifyReschedule(meeting, oldSlot, actor);
  return { meeting, oldSlot, report };
}
