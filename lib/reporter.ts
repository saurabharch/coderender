import { totals, leadsPerDay, topPages, recentLeads } from "./store";
import { sendMail, dailyReportMail } from "./mailer";
import { ADMIN_EMAILS } from "./auth";

export async function buildDailyStats() {
  const t = totals();
  const rows = [
    { label: "Leads (total / today)", value: `${t.leads} / ${t.leadsToday}` },
    { label: "Events today", value: String(t.eventsToday) },
    { label: "Subscribers", value: String(t.subscribers) },
    { label: "Orders", value: String(t.orders) },
    { label: "Revenue paid (₹)", value: String(t.revenue) },
  ];
  const perDay = leadsPerDay(7);
  const pages = topPages(5);
  const latest = recentLeads(10) as { name: string; phone: string; businessType: string }[];
  return { rows, perDay, pages, latest };
}

export async function sendDailyReport(to?: string): Promise<void> {
  const date = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
  const { rows, latest } = await buildDailyStats();
  const html = dailyReportMail(date, rows, latest);
  const recipients = to ? [to] : ADMIN_EMAILS;
  for (const r of recipients) await sendMail(r, `CodeRender daily report — ${date}`, html);
}
