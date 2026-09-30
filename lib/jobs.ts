import { Inngest, NonRetriableError } from "inngest";
import { getDb } from "./store";
import { buildDailyStats } from "./reporter";
import { sendMail } from "./mailer";
import { scoreReply } from "./evals";

// Inngest client: app id + env selectable; keyless locally (INNGEST_DEV=1),
// Cloud execution when INNGEST_EVENT_KEY/SIGNING_KEY are set.
export const inngest = new Inngest({
  id: process.env.INNGEST_APP_ID || "coderender",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

// ---- durable bodies (also executed by runLocal on-device) ----

async function doDailyReport() {
  const { rows, latest } = await buildDailyStats();
  const { dailyReportMail } = await import("./mailer");
  const date = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
  const { ADMIN_EMAILS } = await import("./auth");
  for (const r of ADMIN_EMAILS)
    await sendMail(r, `CodeRender daily report — ${date}`, dailyReportMail(date, rows, latest));
  return { ok: true };
}

async function doLeadCreated(data: { leadId: number }) {
  const lead = getDb().prepare("SELECT * FROM Lead WHERE id=?").get(data.leadId) as
    { name: string; phone: string; businessType: string } | undefined;
  if (!lead) throw new NonRetriableError("lead not found");
  getDb().prepare("INSERT INTO Notification (title, body, audience) VALUES (?,?,?)").run(
    `New lead: ${lead.name}`,
    `${lead.phone} · ${lead.businessType}`,
    "team"
  );
  return { ok: true };
}

async function doNurture(data: { leadId: number }) {
  const lead = getDb().prepare("SELECT status, name FROM Lead WHERE id=?").get(data.leadId) as
    { status: string; name: string } | undefined;
  if (!lead) throw new NonRetriableError("lead not found");
  if ((lead.status || "new") !== "new") return { ok: true, skipped: "converted" };
  getDb().prepare("INSERT INTO Notification (title, body, audience) VALUES (?,?,?)").run(
    `Nurture: ${lead.name} still new`,
    "Follow up today — 24h since capture.",
    "team"
  );
  return { ok: true };
}

const INTENT_RULES: [RegExp, string][] = [
  [/price|cost|charge|fee|₹/i, "pricing"],
  [/book|slot|appointment|visit|trial/i, "booking"],
  [/hour|timing|open|location|where/i, "info"],
];

function classify(text: string): string {
  for (const [re, intent] of INTENT_RULES) if (re.test(text)) return intent;
  return "general";
}

const DRAFTS: Record<string, string> = {
  pricing: "Thanks for asking! Share which service and I'll send exact prices right away.",
  booking: "Happy to book you in — which day and time works best?",
  info: "Good question! Our hours are Mon–Sat, 10:30 AM–7 PM. What else can I help with?",
  general: "Thanks for reaching out! A teammate replies within one business day.",
};

async function doSupportTriage(data: { message: string; threadId?: number }) {
  const intent = classify(data.message);
  let draft = DRAFTS[intent];
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const base = process.env.OPENAI_BASE_URL || "https://api.openai.com";
      const res = await fetch(`${base}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: process.env.AI_MODEL || "gpt-4o-mini",
          messages: [{ role: "user", content: `Intent: ${intent}. Customer says: ${data.message}. Reply in 1–2 sentences, no promises about rankings.` }],
          max_tokens: 200,
        }),
      });
      if (res.ok) {
        const j = await res.json();
        const text = String(j.choices?.[0]?.message?.content ?? "").slice(0, 1000);
        if (text) draft = text;
      }
    } catch { /* template stands */ }
  }
  const { score, notes } = scoreReply(draft);
  if (data.threadId) {
    getDb().prepare("INSERT INTO ChatMessage (threadId, role, body) VALUES (?,?,?)").run(data.threadId, "assistant", draft);
    getDb().prepare("INSERT INTO Eval (threadId, score, rubric) VALUES (?,?,?)").run(data.threadId, score, notes.join("; "));
  }
  return { ok: true, intent, score };
}

// ---- durable functions (steps, retries, flow control, cancellation) ----

export const dailyReportFn = inngest.createFunction(
  { id: "daily-report", triggers: { cron: "25 18 * * *" }, retries: 2 }, // 23:55 IST
  async ({ step }) => {
    const stats = await step.run("gather", async () => buildDailyStats());
    await step.run("send", async () => {
      const { dailyReportMail } = await import("./mailer");
      const { ADMIN_EMAILS } = await import("./auth");
      const date = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
      for (const r of ADMIN_EMAILS)
        await sendMail(r, `CodeRender daily report — ${date}`, dailyReportMail(date, stats.rows, stats.latest));
    });
    return { ok: true };
  }
);

export const leadCreatedFn = inngest.createFunction(
  { id: "lead-created", triggers: { event: "app/lead.created" }, retries: 3 },
  async ({ event, step }) => {
    await step.run("notify-team", async () => doLeadCreated(event.data as { leadId: number }));
    await step.sleep("nurture-wait", "24h");
    await step.run("nurture-check", async () => doNurture(event.data as { leadId: number }));
    return { ok: true };
  }
);

export const broadcastFn = inngest.createFunction(
  {
    id: "broadcast-dispatch",
    triggers: { event: "app/broadcast.created" },
    retries: 2,
    concurrency: { limit: 3 },
    throttle: { limit: 2, period: "1m" },
    cancelOn: [{ event: "app/ops.cancel" }],
  },
  async ({ event, step }) => {
    const n = await step.run("load", async () => {
      const row = getDb().prepare("SELECT * FROM Notification WHERE id=?").get(
        (event.data as { notificationId: number }).notificationId
      );
      if (!row) throw new NonRetriableError("notification not found");
      return { ok: true };
    });
    return n;
  }
);

export const supportTriageFn = inngest.createFunction(
  { id: "support-triage", triggers: { event: "app/support.message" }, retries: 2, concurrency: { limit: 5 } },
  async ({ event, step }) => {
    const data = event.data as { message: string; threadId?: number };
    const intent = await step.run("classify", async () => classify(data.message));
    const out = await step.run("draft", async () => doSupportTriage(data));
    return { ok: true, intent, score: out.score };
  }
);

export const functions = [dailyReportFn, leadCreatedFn, broadcastFn, supportTriageFn];

// Local runner: executes bodies in-process (scheduler, emit fallback, manual).
export async function runLocal(name: "dailyReport" | "leadCreated" | "nurture" | "supportTriage", data?: { leadId?: number; message?: string; threadId?: number }) {
  if (name === "dailyReport") return doDailyReport();
  if (name === "leadCreated") return doLeadCreated({ leadId: data?.leadId ?? 0 });
  if (name === "nurture") return doNurture({ leadId: data?.leadId ?? 0 });
  return doSupportTriage({ message: data?.message ?? "", threadId: data?.threadId });
}
