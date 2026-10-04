import { getDb, getPref } from "./store";

export type FlowTrigger = { kind: "manual" | "ticket" | "lead"; match?: string };
export type FlowStep = { channel: "wa" | "email" | "telegram" | "slack"; template?: string; body?: string };

export const CHANNELS = ["wa", "email", "telegram", "slack"] as const;

// Per-channel kill switches (dashboard-toggled, checked before every send).
export function channelLive(channel: string): boolean {
  return getPref(`channel_kill_${channel}`, "on") !== "off";
}

export interface Flow {
  id: number; name: string; trigger: FlowTrigger; steps: FlowStep[]; enabled: number;
}

function parseTrigger(raw: string): FlowTrigger {
  try {
    const t = JSON.parse(raw || "{}");
    if (t.kind === "ticket" || t.kind === "lead") return { kind: t.kind, match: String(t.match ?? "").slice(0, 80) };
  } catch { /* manual */ }
  return { kind: "manual" };
}

function parseSteps(raw: string): FlowStep[] {
  try {
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, 10).map((s) => ({
      channel: (["wa", "email", "telegram", "slack"] as const).includes(s.channel) ? s.channel : "email",
      template: String(s.template ?? "").slice(0, 80),
      body: String(s.body ?? "").slice(0, 2000),
    }));
  } catch {
    return [];
  }
}

export function listFlows(): Flow[] {
  return (getDb().prepare("SELECT * FROM Flow ORDER BY id DESC LIMIT 100").all() as
    { id: number; name: string; trigger: string; steps: string; enabled: number }[])
    .map((r) => ({ id: r.id, name: r.name, trigger: parseTrigger(r.trigger), steps: parseSteps(r.steps), enabled: r.enabled }));
}

export function createFlow(input: { name: string; trigger?: FlowTrigger; steps?: FlowStep[] }): number {
  const name = String(input.name ?? "").slice(0, 80);
  if (!name.trim()) throw new Error("name required");
  const r = getDb().prepare("INSERT INTO Flow (name, trigger, steps) VALUES (?,?,?)").run(
    name, JSON.stringify(input.trigger ?? { kind: "manual" }), JSON.stringify(parseSteps(JSON.stringify(input.steps ?? []))));
  return Number(r.lastInsertRowid);
}

export function updateFlow(id: number, input: { name?: string; trigger?: FlowTrigger; steps?: FlowStep[]; enabled?: boolean }): void {
  const cur = getDb().prepare("SELECT * FROM Flow WHERE id=?").get(id) as { name: string; trigger: string; steps: string; enabled: number } | undefined;
  if (!cur) throw new Error("not found");
  getDb().prepare("UPDATE Flow SET name=?, trigger=?, steps=?, enabled=? WHERE id=?").run(
    input.name !== undefined ? String(input.name).slice(0, 80) : cur.name,
    input.trigger !== undefined ? JSON.stringify(input.trigger) : cur.trigger,
    input.steps !== undefined ? JSON.stringify(parseSteps(JSON.stringify(input.steps))) : cur.steps,
    input.enabled !== undefined ? (input.enabled ? 1 : 0) : cur.enabled, id);
}

export function deleteFlow(id: number): void {
  getDb().prepare("DELETE FROM FlowRun WHERE flowId=?").run(id);
  getDb().prepare("DELETE FROM Flow WHERE id=?").run(id);
}

export interface FlowCtx {
  to?: string; email?: string; subject?: string; text?: string;
}

// Execute steps in order; dead channels are skipped (never fail the run).
export async function runFlow(id: number, ctx: FlowCtx): Promise<{ ok: boolean; ran: string[] }> {
  const d = getDb();
  const row = d.prepare("SELECT * FROM Flow WHERE id=? AND enabled=1").get(id) as
    { id: number; name: string; steps: string } | undefined;
  if (!row) throw new Error("flow not found or disabled");
  const steps = parseSteps(row.steps);
  const ran: string[] = [];
  const { renderTemplate } = await import("./wa-crm-core");
  for (const s of steps) {
    if (!channelLive(s.channel)) {
      ran.push(`${s.channel}: killed`);
      continue;
    }
    const vars = [ctx.to ?? "", ctx.subject ?? ""];
    const text = renderTemplate(s.body || s.template || "", vars) || ctx.text || "";
    try {
      if (s.channel === "wa" && ctx.to) {
        const { sendWhatsApp } = await import("./providers");
        const r = await sendWhatsApp(ctx.to, text || s.body || "");
        ran.push(`wa: ${r.sent ? "sent" : r.via.slice(0, 60)}`);
      } else if (s.channel === "email" && ctx.email) {
        const { sendMail } = await import("./mailer");
        await sendMail(ctx.email, ctx.subject || row.name, `<p>${text.replace(/\n/g, "<br>")}</p>`);
        ran.push("email: sent");
      } else if (s.channel === "telegram") {
        const { sendTelegram } = await import("./providers");
        const r = await sendTelegram(`${ctx.subject || row.name}\n${text}`);
        ran.push(`telegram: ${r.sent ? "sent" : r.note}`);
      } else if (s.channel === "slack") {
        const { announce } = await import("./providers");
        const r = await announce(ctx.subject || row.name, text);
        ran.push(`slack: ${String(r.slack)}`);
      } else {
        ran.push(`${s.channel}: no target`);
      }
    } catch (e) {
      ran.push(`${s.channel}: failed (${e instanceof Error ? e.message.slice(0, 60) : "err"})`);
    }
  }
  d.prepare("INSERT INTO FlowRun (flowId, status, detail) VALUES (?,?,?)").run(
    id, ran.some((r) => r.includes("failed")) ? "partial" : "ok", ran.join(" | ").slice(0, 2000));
  return { ok: true, ran };
}

// Event fan-out: flows whose trigger matches (called from ticket/lead paths).
export async function fireFlows(kind: "ticket" | "lead", ctx: FlowCtx & { text?: string }): Promise<number> {
  let n = 0;
  for (const f of listFlows().filter((x) => x.enabled && x.trigger.kind === kind)) {
    const m = (f.trigger.match || "").toLowerCase();
    const hay = `${ctx.subject ?? ""} ${ctx.text ?? ""}`.toLowerCase();
    if (m && !hay.includes(m)) continue;
    await runFlow(f.id, ctx).catch(() => {});
    n++;
  }
  return n;
}

export function flowRuns(flowId: number, limit = 20) {
  return getDb().prepare("SELECT * FROM FlowRun WHERE flowId=? ORDER BY id DESC LIMIT ?").all(flowId, limit);
}
