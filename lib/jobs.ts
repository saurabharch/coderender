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
  const { runNetwork } = await import("./agent-net");
  const thread = data.threadId
    ? (getDb().prepare("SELECT userId FROM ChatThread WHERE id=?").get(data.threadId) as { userId: number } | undefined)
    : undefined;
  const out = await runNetwork({ userId: thread?.userId ?? 0, message: data.message, threadId: data.threadId });
  const draft = out.text || DRAFTS.general;
  const { scoreReply } = await import("./evals");
  const { score, notes } = scoreReply(draft);
  if (data.threadId) {
    getDb().prepare("INSERT INTO ChatMessage (threadId, role, body) VALUES (?,?,?)").run(data.threadId, "assistant", draft);
    getDb().prepare("INSERT INTO Eval (threadId, score, rubric) VALUES (?,?,?)").run(data.threadId, score, notes.join("; "));
  }
  return { ok: true, intent: out.scope, score };
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

export const nightlyDistillFn = inngest.createFunction(
  { id: "nightly-distill", triggers: { cron: "30 20 * * *" }, retries: 1 },
  async ({ step }) => {
    const r = await step.run("distill", async () => {
      const { runNightlyDistill } = await import("./learn");
      return runNightlyDistill();
    });
    return r;
  }
);

async function doAgentCall(data: { op: string; params?: Record<string, unknown>; keyName?: string }) {
  const { runAgentOp } = await import("./agent-ops");
  return runAgentOp(data.op, data.params ?? {}, data.keyName ?? "key");
}

export const agentCallFn = inngest.createFunction(
  { id: "agent-call", triggers: { event: "app/agent.call" }, retries: 2, concurrency: { limit: 5 } },
  async ({ event, step }) => {
    const data = event.data as { op: string; params?: Record<string, unknown>; keyName?: string };
    return step.run("exec", async () => doAgentCall(data));
  }
);

async function doScanTicketFile(data: { attachmentId: number }) {
  const { getDb } = await import("./store");
  const row = getDb().prepare("SELECT * FROM TicketAttachment WHERE id=?").get(data.attachmentId) as
    { id: number; ticketId: number; filename: string; mime: string } | undefined;
  if (!row) throw new NonRetriableError("attachment not found");
  const { join } = await import("node:path");
  const { scanFile } = await import("./scan");
  const r = await scanFile(join(process.cwd(), "public", "uploads", "tickets", row.filename), row.mime);
  const { logEvent } = await import("./tickets");
  if (r.verdict === "infected") {
    const { unlink } = await import("node:fs/promises");
    await unlink(join(process.cwd(), "public", "uploads", "tickets", row.filename)).catch(() => {});
    getDb().prepare("UPDATE TicketAttachment SET status='infected' WHERE id=?").run(row.id);
    logEvent(row.ticketId, "scanner", "scan", `Attachment #${row.id} quarantined (${r.backend}: ${r.detail})`);
    return { ok: true, verdict: "infected" as const };
  }
  getDb().prepare("UPDATE TicketAttachment SET status='clean' WHERE id=?").run(row.id);
  logEvent(row.ticketId, "scanner", "scan", `Attachment #${row.id} cleared (${r.backend})`);
  return { ok: true, verdict: "clean" as const };
}

export const scanTicketFileFn = inngest.createFunction(
  { id: "scan-ticket-file", triggers: { event: "app/scan.ticketfile" }, retries: 2, concurrency: { limit: 3 } },
  async ({ event, step }) => {
    return step.run("scan", async () => doScanTicketFile(event.data as { attachmentId: number }));
  }
);


// Local runner: executes bodies in-process (scheduler, emit fallback, manual).
export const bgRemoveFn = inngest.createFunction(
  { id: "media-bgremove", triggers: { event: "app/media.bgremove" }, retries: 1 },
  async ({ event, step }) => {
    const { jobId } = event.data as { jobId: number };
    await step.run("remove", async () => {
      const { runBgRemove } = await import("./bgremove");
      const r = await runBgRemove(jobId);
      // Deferred to the browser worker is success (primary path) — only
      // permanent failures throw; the original image is always kept.
      if (!r.ok && !r.deferred) throw new NonRetriableError("bgremove failed (original kept)");
      return r;
    });
    return { ok: true };
  }
);

export async function runLocal(name: "dailyReport" | "leadCreated" | "nurture" | "supportTriage" | "nightlyDistill" | "agentCall" | "scanTicketFile" | "bgRemove", data?: { leadId?: number; message?: string; threadId?: number; op?: string; params?: Record<string, unknown>; keyName?: string; attachmentId?: number; jobId?: number }) {
  if (name === "agentCall") return doAgentCall({ op: data?.op ?? "", params: data?.params, keyName: data?.keyName });
  if (name === "bgRemove") {
    const { runBgRemove } = await import("./bgremove");
    return runBgRemove(data?.jobId ?? 0);
  }
  if (name === "scanTicketFile") return doScanTicketFile({ attachmentId: data?.attachmentId ?? 0 });
  if (name === "dailyReport") return doDailyReport();
  if (name === "nightlyDistill") {
    const { runNightlyDistill } = await import("./learn");
    return runNightlyDistill();
  }
  if (name === "leadCreated") return doLeadCreated({ leadId: data?.leadId ?? 0 });
  if (name === "nurture") return doNurture({ leadId: data?.leadId ?? 0 });
  return doSupportTriage({ message: data?.message ?? "", threadId: data?.threadId });
}

export const functions = [dailyReportFn, leadCreatedFn, broadcastFn, supportTriageFn, nightlyDistillFn, agentCallFn, scanTicketFileFn, bgRemoveFn];
