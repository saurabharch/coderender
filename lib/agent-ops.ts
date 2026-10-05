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
  "ticket.list": { scope: "agent:read", desc: "List tickets", params: "{status?, limit?}" },
  "ticket.get": { scope: "agent:read", desc: "Ticket detail + timeline", params: "{id}" },
  "ticket.resolve": { scope: "agent:write", desc: "Resolve with note", params: "{id, resolution}" },
  "stock.level": { scope: "agent:read", desc: "Stock levels (?warehouse)", params: "{warehouse?}" },
  "order.list": { scope: "agent:read", desc: "Recent shop orders", params: "{status?}" },
  "bill.list": { scope: "agent:read", desc: "Recent bills", params: "{status?}" },
  "customer.segment": { scope: "agent:read", desc: "Customers by segment + spend", params: "{segment}" },
} as const;

export type AgentOp = keyof typeof AGENT_OPS;

const idParam = z.object({ id: z.coerce.number().int() });

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
      const r = await createLead(parsed.data);
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
    case "ticket.list": {
      const { listTickets } = await import("./tickets");
      const p = z.object({ status: z.string().max(20).optional(), limit: z.coerce.number().int().min(1).max(50).optional() }).parse(params);
      const r = listTickets(p.status || undefined, p.limit ?? 20);
      audit({ n: r.length });
      return { tickets: r.map((t) => ({ id: t.id, subject: t.subject, status: t.status, assignee: t.assigneeEmail })) };
    }
    case "ticket.get": {
      const { getTicket } = await import("./tickets");
      const { id } = idParam.parse(params);
      const t = getTicket(id);
      if (!t) throw new Error("not found");
      audit({ id });
      return { result: `#${t.id} ${t.subject}: ${t.status}, owner ${t.assigneeEmail || "none"}. Latest: ${t.events[t.events.length - 1]?.body.slice(0, 200) || "filed"}` };
    }
    case "stock.level": {
      const { stockLevels } = await import("./inventory");
      const p = z.object({ warehouse: z.coerce.number().int().min(0).optional() }).parse(params);
      const levels = (stockLevels(p.warehouse ?? 0) as { name: string; qty: number }[]).slice(0, 20);
      audit({ n: levels.length });
      return { levels };
    }
    case "order.list": {
      const { listOrders } = await import("./commerce");
      const p = z.object({ status: z.string().max(20).optional() }).parse(params);
      const orders = (listOrders(p.status ?? "") as { id: number; status: string; grand: number }[]).slice(0, 20);
      audit({ n: orders.length });
      return { orders };
    }
    case "bill.list": {
      const { listBills } = await import("./billing");
      const p = z.object({ status: z.string().max(20).optional() }).parse(params);
      const bills = (listBills(p.status ?? "") as { no: string; grand: number; status: string }[]).slice(0, 20);
      audit({ n: bills.length });
      return { bills };
    }
    case "customer.segment": {
      const { segmentList } = await import("./crm");
      const p = z.object({ segment: z.enum(["new", "active", "dormant", "lost", "vip"]) }).parse(params);
      const customers = segmentList(p.segment, 20);
      audit({ n: customers.length });
      return { customers };
    }
    case "ticket.resolve": {
      const { resolveTicket } = await import("./tickets");
      const p = z.object({ id: z.coerce.number().int(), resolution: z.string().min(4).max(2000) }).parse(params);
      await resolveTicket(p.id, `agent:${keyName}`, p.resolution);
      audit({ id: p.id });
      return { ok: true };
    }
    default:
      throw new Error("unknown op");
  }
}

export function agentScopeFor(op: string): string | null {
  return (AGENT_OPS as Record<string, { scope: string }>)[op]?.scope ?? null;
}
