import { inngest } from "./jobs";

// Event catalog: every cross-cutting trigger in one place.
// emit() sends to Inngest Cloud when keys exist, and always runs the local
// handler too — so behavior is identical on-device and in production.
export const APP_EVENTS = [
  "app/lead.created",
  "app/lead.nurture",
  "app/support.message",
  "app/broadcast.created",
  "app/ops.cancel",
  "app/daily-report",
] as const;

export type AppEvent = (typeof APP_EVENTS)[number];

export async function emit(name: AppEvent, data: Record<string, unknown> = {}) {
  if (process.env.INNGEST_EVENT_KEY) {
    try {
      await inngest.send({ name, data });
    } catch { /* cloud optional; local still runs */ }
  }
  const { runLocal } = await import("./jobs");
  if (name === "app/lead.created" && typeof data.leadId === "number")
    return runLocal("leadCreated", { leadId: data.leadId });
  if (name === "app/support.message")
    return runLocal("supportTriage", data as { message: string; threadId?: number });
  if (name === "app/daily-report") return runLocal("dailyReport");
  return { ok: true, local: "noop" };
}
