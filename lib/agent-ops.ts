// Allowlisted agent operations (the ONLY thing API keys may invoke).
// Every call is PII-redacted and audited to AiAudit. Reads need
// `agent:read`, writes need `agent:write` (or `admin`).
import { z } from "zod";
import { getDb } from "./store";
import { redact } from "./ai-gateway";

export const AGENT_OPS = {
  "board.overview": { scope: "agent:read", desc: "List boards with open-task counts" },
  "board.detail": { scope: "agent:read", desc: "Board columns + tasks", params: "{id}" },
  "board.stats": { scope: "agent:read", desc: "Board analytics summary", params: "{id}" },
  "task.create": { scope: "agent:write", desc: "Create a task", params: "{boardId, title, columnId?, priority?}" },
  "task.move": { scope: "agent:write", desc: "Move a task", params: "{taskId, columnId?, column?}" },
  "form.list": { scope: "agent:read", desc: "List forms with submission counts" },
  "lead.create": { scope: "agent:write", desc: "Create a lead", params: "{name, phone, businessType?, source?}" },
  "cms.list": { scope: "agent:read", desc: "List published CMS items", params: "{type, limit?}" },
} as const;

export type AgentOp = keyof typeof AGENT_OPS;

const idParam = z.object({ id: z.number().int() });

export async function runAgentOp(op: string, params: Record<string, unknown>, keyName: string): Promise<unknown> {
  const Red = (o: unknown) => redact(JSON.stringify(o ?? {})).slice(0, 500);
  const audit = (result: unknown) => {
    try {
      getDb().prepare("INSERT INTO AiAudit (userId, scope, excerpt, runtime) VALUES (?,?,?,?)").run(
        0, "agent", `${keyName} ${op} ${Red(params)}`.slice(0, 500), JSON.stringify(result).slice(0, 500));
    } catch { /* audit never breaks ops */ }
  };
  const { agentBoard, agentOverview, boardStats, createTask, getBoard, moveTask } = await import("./kanban");
  switch (op) {
    case "board.overview": {
      const r = agentOverview();
      audit({ n: r.length });
      return { result: r };
    }
    case "board.detail": {
      const { id } = idParam.parse(params);
      const r = agentBoard(id);
      audit({ id });
      return { result: r };
    }
    case "board.stats": {
      const { id } = idParam.parse(params);
      const s = boardStats(id);
      const r = `open ${s.total} (${s.perColumn.map((c) => `${c.name}:${c.n}`).join(",")}) done7d ${s.done7d} cycle ${s.avgCycleDays}d`;
      audit({ id });
      return { result: r };
    }
    case "task.create": {
      const p = z.object({
        boardId: z.number().int(), title: z.string().min(1).max(160),
        columnId: z.number().int().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      }).parse(params);
      const id = await createTask(p.boardId, p);
      audit({ id });
      return { id };
    }
    case "task.move": {
      const p = z.object({
        taskId: z.number().int(), columnId: z.number().int().optional(), column: z.string().max(40).optional(),
      }).parse(params);
      let target = p.columnId;
      if (!target && p.column) {
        const t = getDb().prepare("SELECT boardId FROM KanbanTask WHERE id=?").get(p.taskId) as { boardId: number } | undefined;
        const b = t ? getBoard(t.boardId) : null;
        target = b?.columns.find((c) => c.name.toLowerCase().includes(p.column!.toLowerCase()))?.id;
      }
      if (!target) throw new Error("no target column");
      await moveTask(p.taskId, target);
      audit({ task: p.taskId, to: target });
      return { ok: true };
    }
    case "form.list": {
      const { listForms } = await import("./forms");
      const r = listForms({ limit: 50 }).map((f) => ({ id: f.id, title: f.title, slug: f.slug, status: f.status, submissions: f.submissions }));
      audit({ n: r.length });
      return { forms: r };
    }
    case "lead.create": {
      const { createLead } = await import("./leads");
      const { leadSchema } = await import("./lead-schema");
      const parsed = leadSchema.safeParse({ businessType: "general", source: "agent", ...(params as object) });
      if (!parsed.success) throw new Error("bad lead");
      const r = createLead(parsed.data);
      audit({ id: r.id });
      return r;
    }
    case "cms.list": {
      const { listItems } = await import("./cms");
      const p = z.object({ type: z.string().min(1).max(40), limit: z.number().int().min(1).max(50).optional() }).parse(params);
      const { schemaFor } = await import("./cms-schemas");
      if (!schemaFor(p.type)) throw new Error("unknown type");
      const r = listItems(p.type, p.limit ?? 20, { publishedOnly: true, withRelated: false });
      audit({ type: p.type, n: r.length });
      return { items: r.map((x) => ({ id: x.id, slug: x.slug, data: x.data })) };
    }
    default:
      throw new Error("unknown op");
  }
}

export function agentScopeFor(op: string): string | null {
  return (AGENT_OPS as Record<string, { scope: string }>)[op]?.scope ?? null;
}
