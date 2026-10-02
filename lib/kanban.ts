import { getDb } from "./store";
import { isPriority, normalizeOrder, boardAnalytics, type BoardAnalytics } from "./kanban-core";

export type { BoardAnalytics };
export { PRIORITIES, priorityBadge, isPriority } from "./kanban-core";

export interface KanbanHooks {
  onBeforeCreateBoard?: (data: { name: string }) => void | Promise<void>;
  onAfterCreateBoard?: (id: number) => void | Promise<void>;
  onBeforeUpdateBoard?: (id: number) => void | Promise<void>;
  onAfterUpdateBoard?: (id: number) => void | Promise<void>;
  onBeforeDeleteBoard?: (id: number) => void | Promise<void>;
  onAfterDeleteBoard?: (id: number) => void | Promise<void>;
  onBeforeCreateTask?: (boardId: number) => void | Promise<void>;
  onAfterCreateTask?: (id: number) => void | Promise<void>;
  onBeforeMoveTask?: (id: number, toColumn: number) => void | Promise<void>;
  onAfterMoveTask?: (id: number, toColumn: number) => void | Promise<void>;
  onBeforeDeleteTask?: (id: number) => void | Promise<void>;
  onAfterDeleteTask?: (id: number) => void | Promise<void>;
  onError?: (op: string, err: unknown) => void | Promise<void>;
}

let hooks: KanbanHooks = {};

export function setKanbanHooks(h: KanbanHooks) {
  hooks = { ...hooks, ...h };
}

export function boardSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function track(type: string, boardId: number, data: unknown) {
  try {
    getDb().prepare("INSERT INTO Event (type, path, data) VALUES (?,?,?)").run(
      type, `/admin/boards/${boardId}`, JSON.stringify(data).slice(0, 300));
  } catch { /* telemetry never breaks boards */ }
}

export interface BoardSummary {
  id: number; name: string; slug: string; description: string;
  formId: number | null; columns: number; tasks: number;
}

export function listBoards(): BoardSummary[] {
  const d = getDb();
  const rows = d.prepare("SELECT * FROM KanbanBoard ORDER BY id DESC").all() as
    { id: number; name: string; slug: string; description: string; formId: number | null }[];
  return rows.map((b) => ({
    ...b,
    columns: (d.prepare("SELECT COUNT(*) c FROM KanbanColumn WHERE boardId=?").get(b.id) as { c: number }).c,
    tasks: (d.prepare("SELECT COUNT(*) c FROM KanbanTask WHERE boardId=? AND archived=0").get(b.id) as { c: number }).c,
  }));
}

export interface BoardTask {
  id: number; boardId: number; columnId: number; title: string; body: string;
  priority: string; assigneeEmail: string; ord: number;
  submissionId: number | null; archived: number; createdAt: string; doneAt: string;
  attachments: string[]; startAt: string; dueAt: string;
  todoDone?: number; todoTotal?: number;
}

function parseAttachments(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((u) => String(u).slice(0, 500)).filter((u) => /^(\/|https?:\/\/)/.test(u)).slice(0, 5);
}

export function dayStr(v: unknown): string {
  const s = String(v ?? "").slice(0, 16);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return "";
}

export function dayPart(v: unknown): string {
  return String(v ?? "").slice(0, 10);
}

export interface BoardDetail {
  id: number; name: string; slug: string; description: string; formId: number | null;
  ownerEmail: string; clientLeadId: number | null;
  client?: { id: number; name: string; phone: string; businessType: string } | null;
  columns: { id: number; name: string; ord: number }[];
  tasks: (BoardTask & { todoDone: number; todoTotal: number })[];
}

export function getBoard(id: number): BoardDetail | null {
  const d = getDb();
  const b = d.prepare("SELECT * FROM KanbanBoard WHERE id=?").get(id) as
    { id: number; name: string; slug: string; description: string; formId: number | null; ownerEmail: string; clientLeadId: number | null } | undefined;
  if (!b) return null;
  const columns = d.prepare("SELECT id, name, ord FROM KanbanColumn WHERE boardId=? ORDER BY ord, id").all(id) as
    { id: number; name: string; ord: number }[];
  const rawTasks = d.prepare("SELECT * FROM KanbanTask WHERE boardId=? ORDER BY ord, id").all(id) as unknown as (Omit<BoardTask, "attachments"> & { attachments: string })[];
  const counts = d.prepare("SELECT taskId, COUNT(*) total, COALESCE(SUM(done),0) done FROM KanbanTodo WHERE taskId IN (SELECT id FROM KanbanTask WHERE boardId=?) GROUP BY taskId").all(id) as
    { taskId: number; total: number; done: number }[];
  const countBy = Object.fromEntries(counts.map((c) => [c.taskId, c]));
  const tasks: (BoardTask & { todoDone: number; todoTotal: number })[] = rawTasks.map((t) => {
    let attachments: string[] = [];
    try {
      const p = JSON.parse(t.attachments || "[]");
      if (Array.isArray(p)) attachments = p.map(String).slice(0, 5);
    } catch { /* keep empty */ }
    const c = countBy[t.id] ?? { total: 0, done: 0 };
    return { ...t, attachments, todoDone: Number(c.done), todoTotal: Number(c.total) };
  });
  // Deep-plain: node:sqlite rows carry null prototypes, which RSC refuses
  // to serialize into client components.
  const client = b.clientLeadId
    ? (d.prepare("SELECT id, name, phone, businessType FROM Lead WHERE id=?").get(b.clientLeadId) as
      { id: number; name: string; phone: string; businessType: string } | undefined) ?? null
    : null;
  return JSON.parse(JSON.stringify({ ...b, client, columns, tasks }));
}

const DEFAULT_COLUMNS = ["To Do", "In Progress", "Done"];

export async function createBoard(input: { name: string; description?: string; formId?: number; ownerEmail?: string }): Promise<number> {
  const name = String(input.name ?? "").slice(0, 80);
  if (!name.trim()) throw new Error("name required");
  await hooks.onBeforeCreateBoard?.({ name });
  const slug = `${boardSlug(name) || "board"}-${Date.now().toString(36)}`;
  const d = getDb();
  const r = d.prepare("INSERT INTO KanbanBoard (name, slug, description, formId, ownerEmail) VALUES (?,?,?,?,?)").run(
    name, slug, String(input.description ?? "").slice(0, 500),
    input.formId ?? null, String(input.ownerEmail ?? "").slice(0, 120));
  const id = Number(r.lastInsertRowid);
  DEFAULT_COLUMNS.forEach((c, i) => d.prepare("INSERT INTO KanbanColumn (boardId, name, ord) VALUES (?,?,?)").run(id, c, i));
  await hooks.onAfterCreateBoard?.(id);
  track("kanban", id, { op: "board.create" });
  return id;
}

export async function updateBoard(id: number, input: {
  name?: string; description?: string; formId?: number | null;
  ownerEmail?: string; clientLeadId?: number | null;
}): Promise<void> {
  const b = getBoard(id);
  if (!b) throw new Error("not found");
  await hooks.onBeforeUpdateBoard?.(id);
  getDb().prepare("UPDATE KanbanBoard SET name=?, description=?, formId=?, ownerEmail=?, clientLeadId=? WHERE id=?").run(
    input.name !== undefined ? String(input.name).slice(0, 80) : b.name,
    input.description !== undefined ? String(input.description).slice(0, 500) : b.description,
    input.formId !== undefined ? input.formId : b.formId,
    input.ownerEmail !== undefined ? String(input.ownerEmail).slice(0, 120) : (b.ownerEmail ?? ""),
    input.clientLeadId !== undefined ? input.clientLeadId : (b.clientLeadId ?? null), id);
  await hooks.onAfterUpdateBoard?.(id);
}

export async function deleteBoard(id: number): Promise<void> {
  await hooks.onBeforeDeleteBoard?.(id);
  const d = getDb();
  d.prepare("DELETE FROM KanbanTask WHERE boardId=?").run(id);
  d.prepare("DELETE FROM KanbanColumn WHERE boardId=?").run(id);
  d.prepare("DELETE FROM KanbanBoard WHERE id=?").run(id);
  await hooks.onAfterDeleteBoard?.(id);
}

export async function createColumn(boardId: number, name: string): Promise<number> {
  if (!getBoard(boardId)) throw new Error("not found");
  const n = String(name ?? "").slice(0, 40);
  if (!n.trim()) throw new Error("name required");
  const d = getDb();
  const max = (d.prepare("SELECT COALESCE(MAX(ord),-1) m FROM KanbanColumn WHERE boardId=?").get(boardId) as { m: number }).m;
  const r = d.prepare("INSERT INTO KanbanColumn (boardId, name, ord) VALUES (?,?,?)").run(boardId, n, max + 1);
  track("kanban", boardId, { op: "column.create" });
  return Number(r.lastInsertRowid);
}

export async function updateColumn(colId: number, name: string): Promise<void> {
  const n = String(name ?? "").slice(0, 40);
  if (!n.trim()) throw new Error("name required");
  getDb().prepare("UPDATE KanbanColumn SET name=? WHERE id=?").run(n, colId);
}

export async function deleteColumn(colId: number): Promise<void> {
  const d = getDb();
  const col = d.prepare("SELECT boardId FROM KanbanColumn WHERE id=?").get(colId) as { boardId: number } | undefined;
  if (!col) throw new Error("not found");
  const first = d.prepare("SELECT id FROM KanbanColumn WHERE boardId=? AND id<>? ORDER BY ord, id").get(col.boardId, colId) as { id: number } | undefined;
  if (first) d.prepare("UPDATE KanbanTask SET columnId=? WHERE columnId=?").run(first.id, colId);
  else d.prepare("DELETE FROM KanbanTask WHERE columnId=?").run(colId);
  d.prepare("DELETE FROM KanbanColumn WHERE id=?").run(colId);
}

export async function reorderColumns(boardId: number, ids: number[]): Promise<void> {
  const d = getDb();
  const own = new Set((d.prepare("SELECT id FROM KanbanColumn WHERE boardId=?").all(boardId) as { id: number }[]).map((c) => c.id));
  const clean = ids.filter((x) => own.has(x));
  if (clean.length !== own.size) throw new Error("must include every column");
  const ord = normalizeOrder(clean);
  for (const [cid, o] of Object.entries(ord)) d.prepare("UPDATE KanbanColumn SET ord=? WHERE id=?").run(o, Number(cid));
}

export async function createTask(boardId: number, input: {
  columnId?: number; title: string; body?: string; priority?: string; assigneeEmail?: string; submissionId?: number;
  attachments?: unknown; startAt?: string; dueAt?: string;
}): Promise<number> {
  const b = getBoard(boardId);
  if (!b) throw new Error("not found");
  const title = String(input.title ?? "").slice(0, 160);
  if (!title.trim()) throw new Error("title required");
  await hooks.onBeforeCreateTask?.(boardId);
  const col = b.columns.find((c) => c.id === input.columnId) ?? b.columns[0];
  if (!col) throw new Error("board has no columns");
  const d = getDb();
  const max = (d.prepare("SELECT COALESCE(MAX(ord),-1) m FROM KanbanTask WHERE columnId=?").get(col.id) as { m: number }).m;
  const r = d.prepare(
    `INSERT INTO KanbanTask (boardId, columnId, title, body, priority, assigneeEmail, ord, submissionId, attachments, startAt, dueAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(boardId, col.id, title, String(input.body ?? "").slice(0, 4000),
    isPriority(input.priority) ? input.priority : "medium",
    String(input.assigneeEmail ?? "").slice(0, 120), max + 1, input.submissionId ?? null,
    JSON.stringify(parseAttachments(input.attachments)),
    dayStr(input.startAt), dayStr(input.dueAt));
  const id = Number(r.lastInsertRowid);
  await hooks.onAfterCreateTask?.(id);
  track("kanban", boardId, { op: "task.create", id });
  return id;
}

export async function updateTask(taskId: number, input: {
  title?: string; body?: string; priority?: string; assigneeEmail?: string; archived?: boolean;
  attachments?: unknown; startAt?: string; dueAt?: string; submissionId?: number | null;
}): Promise<void> {
  const d = getDb();
  const cur = d.prepare("SELECT * FROM KanbanTask WHERE id=?").get(taskId) as (BoardTask & { attachments: string }) | undefined;
  if (!cur) throw new Error("not found");
  const day = (v: unknown, fb: string) => dayStr(v) || fb;
  const curDates = cur as unknown as { startAt: string; dueAt: string };
  const startAt = input.startAt !== undefined ? day(input.startAt, "") : (curDates.startAt ?? "");
  const dueAt = input.dueAt !== undefined ? day(input.dueAt, "") : (curDates.dueAt ?? "");
  const priority = input.priority !== undefined ? (isPriority(input.priority) ? input.priority : cur.priority) : cur.priority;
  let attachments: string[] = [];
  try { attachments = JSON.parse(String(cur.attachments ?? "[]")); } catch { /* keep empty */ }
  if (!Array.isArray(attachments)) attachments = [];
  d.prepare("UPDATE KanbanTask SET title=?, body=?, priority=?, assigneeEmail=?, archived=?, attachments=?, startAt=?, dueAt=?, submissionId=? WHERE id=?").run(
    input.title !== undefined ? String(input.title).slice(0, 160) : cur.title,
    input.body !== undefined ? String(input.body).slice(0, 4000) : cur.body,
    priority,
    input.assigneeEmail !== undefined ? String(input.assigneeEmail).slice(0, 120) : cur.assigneeEmail,
    input.archived !== undefined ? (input.archived ? 1 : 0) : cur.archived,
    input.attachments !== undefined ? JSON.stringify(parseAttachments(input.attachments)) : JSON.stringify(attachments),
    startAt, dueAt,
    input.submissionId !== undefined ? input.submissionId : cur.submissionId,
    taskId);
  track("kanban", cur.boardId, { op: "task.update", id: taskId });
}

export async function moveTask(taskId: number, targetColumnId: number, targetIndex?: number): Promise<void> {
  const d = getDb();
  const cur = d.prepare("SELECT * FROM KanbanTask WHERE id=?").get(taskId) as BoardTask | undefined;
  if (!cur) throw new Error("not found");
  const target = d.prepare("SELECT id, boardId FROM KanbanColumn WHERE id=?").get(targetColumnId) as { id: number; boardId: number } | undefined;
  if (!target || target.boardId !== cur.boardId) throw new Error("column not on this board");
  await hooks.onBeforeMoveTask?.(taskId, targetColumnId);
  const sibs = (d.prepare("SELECT id FROM KanbanTask WHERE columnId=? AND id<>? ORDER BY ord, id").all(targetColumnId, taskId) as { id: number }[]).map((s) => s.id);
  const at = targetIndex === undefined ? sibs.length : Math.max(0, Math.min(targetIndex, sibs.length));
  sibs.splice(at, 0, taskId);
  const ord = normalizeOrder(sibs);
  for (const [cid, o] of Object.entries(ord)) d.prepare("UPDATE KanbanTask SET ord=? WHERE id=?").run(o, Number(cid));
  const doneCol = (d.prepare("SELECT id FROM KanbanColumn WHERE boardId=? ORDER BY ord DESC").get(cur.boardId) as { id: number } | undefined)?.id;
  d.prepare("UPDATE KanbanTask SET columnId=?, doneAt=? WHERE id=?").run(
    targetColumnId, targetColumnId === doneCol ? new Date().toISOString() : "", taskId);
  await hooks.onAfterMoveTask?.(taskId, targetColumnId);
  track("kanban.move", cur.boardId, { id: taskId, to: targetColumnId });
}

export async function reorderTasks(columnId: number, ids: number[]): Promise<void> {
  const d = getDb();
  const own = new Set((d.prepare("SELECT id FROM KanbanTask WHERE columnId=?").all(columnId) as { id: number }[]).map((t) => t.id));
  const clean = ids.filter((x) => own.has(x));
  if (clean.length !== own.size) throw new Error("must include every task");
  const ord = normalizeOrder(clean);
  for (const [tid, o] of Object.entries(ord)) d.prepare("UPDATE KanbanTask SET ord=? WHERE id=?").run(o, Number(tid));
}

export async function deleteTask(taskId: number): Promise<void> {
  await hooks.onBeforeDeleteTask?.(taskId);
  const cur = getDb().prepare("SELECT boardId FROM KanbanTask WHERE id=?").get(taskId) as { boardId: number } | undefined;
  getDb().prepare("DELETE FROM KanbanTask WHERE id=?").run(taskId);
  await hooks.onAfterDeleteTask?.(taskId);
  if (cur) track("kanban", cur.boardId, { op: "task.delete", id: taskId });
}

// ---- board members (team invites for boards + todos) ----
export interface BoardMember { email: string; role: string; designation: string }

export function listMembers(boardId: number): BoardMember[] {
  const rows = getDb().prepare(
    `SELECT m.email, m.role, COALESCE(u.designation,'') designation FROM BoardMember m
     LEFT JOIN AppUser u ON u.email=m.email WHERE m.boardId=? ORDER BY m.email`).all(boardId) as unknown as BoardMember[];
  return rows;
}

export async function inviteMember(boardId: number, email: string, role?: string): Promise<void> {
  if (!getBoard(boardId)) throw new Error("not found");
  const e = String(email).trim().toLowerCase().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error("bad email");
  const r = role === "lead" ? "lead" : "member";
  getDb().prepare("INSERT INTO BoardMember (boardId, email, role) VALUES (?,?,?) ON CONFLICT(boardId, email) DO UPDATE SET role=excluded.role")
    .run(boardId, e, r);
  try {
    getDb().prepare("INSERT INTO Notification (title, body, audience) VALUES (?,?,?)").run(
      `Board invite: ${e}`, `added to board #${boardId} as ${r}`, "team");
  } catch { /* ignore */ }
}

export async function removeMember(boardId: number, email: string): Promise<void> {
  getDb().prepare("DELETE FROM BoardMember WHERE boardId=? AND email=?").run(boardId, String(email).toLowerCase());
}

export interface KanbanUser { id: string; name: string; email: string; designation?: string }

export function designationOf(email: string): string {
  if (!email) return "";
  const r = getDb().prepare("SELECT designation FROM AppUser WHERE email=?").get(email) as { designation: string } | undefined;
  return r?.designation ?? "";
}

export function resolveUser(email: string): KanbanUser | null {
  const r = getDb().prepare("SELECT email FROM AppUser WHERE email=?").get(email) as { email: string } | undefined;
  if (!r) return null;
  return { id: r.email, name: r.email.split("@")[0], email: r.email };
}

export function searchUsers(query: string, limit = 10): KanbanUser[] {
  const q = `%${query.slice(0, 60)}%`;
  const rows = getDb().prepare("SELECT email, designation FROM AppUser WHERE email LIKE ? ORDER BY email LIMIT ?").all(q, limit) as { email: string; designation: string }[];
  return rows.map((r) => ({ id: r.email, name: r.email.split("@")[0], email: r.email, designation: r.designation ?? "" }));
}

// ---- form-submission relation ----

// Boards linked to a form (formId) receive one task per submission.
export async function onFormSubmission(formId: number, formSlug: string, submissionId: number, data: Record<string, unknown>): Promise<number[]> {
  const d = getDb();
  const boards = d.prepare("SELECT id FROM KanbanBoard WHERE formId=?").all(formId) as { id: number }[];
  const out: number[] = [];
  for (const b of boards) {
    const detail = getBoard(b.id);
    if (!detail || detail.columns.length === 0) continue;
    const bits = Object.entries(data).slice(0, 4).map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`).join(" · ");
    const id = await createTask(b.id, {
      columnId: detail.columns[0].id,
      title: `Submission #${submissionId} — ${formSlug}`.slice(0, 160),
      body: bits.slice(0, 1000),
      submissionId,
    });
    out.push(id);
  }
  return out;
}

export function linkedSubmissions(boardId: number, limit = 20): { taskId: string | number; submission: Record<string, unknown> | null }[] {
  const d = getDb();
  const tasks = d.prepare("SELECT id, submissionId FROM KanbanTask WHERE boardId=? AND submissionId IS NOT NULL ORDER BY id DESC LIMIT ?").all(boardId, limit) as
    { id: number; submissionId: number }[];
  return tasks.map((t) => {
    const s = d.prepare("SELECT data FROM Submission WHERE id=?").get(t.submissionId) as { data: string } | undefined;
    let parsed: Record<string, unknown> | null = null;
    try { parsed = s ? JSON.parse(s.data) : null; } catch { /* keep null */ }
    return { taskId: t.id, submission: parsed };
  });
}

// ---- analytics ----

export function boardStats(boardId: number): BoardAnalytics {
  const d = getDb();
  const columns = d.prepare("SELECT id, name FROM KanbanColumn WHERE boardId=? ORDER BY ord, id").all(boardId) as { id: number; name: string }[];
  const tasks = d.prepare("SELECT columnId, priority, createdAt, doneAt, archived FROM KanbanTask WHERE boardId=?").all(boardId) as
    { columnId: number; priority: string; createdAt: string; doneAt: string; archived: number }[];
  const moves = d.prepare(
    `SELECT substr(createdAt,1,10) day, COUNT(*) n FROM Event
     WHERE type='kanban.move' AND path=? AND createdAt >= date('now','-14 days')
     GROUP BY day ORDER BY day`).all(`/admin/boards/${boardId}`) as { day: string; n: number }[];
  return boardAnalytics({ columns, tasks, moves });
}

// ---- agent-facing summaries (team chat tracking) ----

export function agentOverview(): string {
  const boards = listBoards();
  if (boards.length === 0) return "No kanban boards yet.";
  return boards.map((b) => {
    const d = getDb();
    const cols = d.prepare("SELECT name FROM KanbanColumn WHERE boardId=? ORDER BY ord").all(b.id) as { name: string }[];
    return `#${b.id} ${b.name}: ${b.tasks} open tasks across [${cols.map((c) => c.name).join(" → ")}]${b.formId ? ` (linked form #${b.formId})` : ""}`;
  }).join(" | ").slice(0, 1500);
}

export function agentBoard(id: number): string {
  const b = getBoard(id);
  if (!b) return "Board not found.";
  const lines = b.columns.map((c) => {
    const ts = b.tasks.filter((t) => t.columnId === c.id && !t.archived);
    const top = ts.slice(0, 5).map((t) => `${t.title}${t.priority !== "medium" ? ` [${t.priority}]` : ""}${t.assigneeEmail ? ` @${t.assigneeEmail.split("@")[0]}` : ""}`).join("; ");
    return `${c.name} (${ts.length}): ${top || "—"}`;
  });
  return `${b.name}: ${lines.join(" | ")}`.slice(0, 1500);
}
