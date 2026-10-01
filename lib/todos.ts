import { getDb } from "./store";

export interface Todo {
  id: number; taskId: number | null; title: string; body: string;
  status: string; assigneeEmail: string; ord: number; createdAt: string;
}

// ---- per-task checklist (kanban-todo threads attach to these ids) ----
export interface ChecklistItem { id: number; label: string; done: number; ord: number }

export function listChecklist(taskId: number): ChecklistItem[] {
  return getDb().prepare("SELECT id, label, done, ord FROM KanbanTodo WHERE taskId=? ORDER BY ord, id").all(taskId) as unknown as ChecklistItem[];
}

export function addChecklist(taskId: number, label: string): number {
  const t = getDb().prepare("SELECT boardId FROM KanbanTask WHERE id=?").get(taskId) as { boardId: number } | undefined;
  if (!t) throw new Error("task not found");
  const max = (getDb().prepare("SELECT COALESCE(MAX(ord),-1) m FROM KanbanTodo WHERE taskId=?").get(taskId) as { m: number }).m;
  const r = getDb().prepare("INSERT INTO KanbanTodo (taskId, label, ord) VALUES (?,?,?)").run(taskId, String(label).slice(0, 160), max + 1);
  return Number(r.lastInsertRowid);
}

export function toggleChecklist(id: number, done: boolean): void {
  getDb().prepare("UPDATE KanbanTodo SET done=? WHERE id=?").run(done ? 1 : 0, id);
}

export function deleteChecklist(id: number): void {
  getDb().prepare("DELETE FROM KanbanTodo WHERE id=?").run(id);
}

// ---- standalone team todos (todo threads attach to these ids) ----
export function listTodos(status?: string): Todo[] {
  const d = getDb();
  const rows = (status
    ? d.prepare("SELECT * FROM TeamTodo WHERE status=? ORDER BY ord, id").all(status)
    : d.prepare("SELECT * FROM TeamTodo ORDER BY ord, id").all()) as unknown as Todo[];
  return rows;
}

export function getTodo(id: number): Todo | null {
  return getDb().prepare("SELECT * FROM TeamTodo WHERE id=?").get(id) as unknown as Todo | null ?? null;
}

export function createTodo(input: { title: string; body?: string; assigneeEmail?: string }): number {
  const title = String(input.title ?? "").slice(0, 120);
  if (!title.trim()) throw new Error("title required");
  const d = getDb();
  const max = (d.prepare("SELECT COALESCE(MAX(ord),-1) m FROM TeamTodo").get() as { m: number }).m;
  const r = d.prepare("INSERT INTO TeamTodo (title, body, assigneeEmail, ord) VALUES (?,?,?,?)").run(
    title, String(input.body ?? "").slice(0, 2000), String(input.assigneeEmail ?? "").slice(0, 120), max + 1);
  return Number(r.lastInsertRowid);
}

export function updateTodo(id: number, input: { title?: string; body?: string; status?: string; assigneeEmail?: string }): number {
  const cur = getTodo(id);
  if (!cur) throw new Error("not found");
  const status = input.status === "done" || input.status === "open" ? input.status : cur.status;
  getDb().prepare("UPDATE TeamTodo SET title=?, body=?, status=?, assigneeEmail=? WHERE id=?").run(
    input.title !== undefined ? String(input.title).slice(0, 120) : cur.title,
    input.body !== undefined ? String(input.body).slice(0, 2000) : cur.body,
    status,
    input.assigneeEmail !== undefined ? String(input.assigneeEmail).slice(0, 120) : cur.assigneeEmail,
    id);
  return id;
}

export function deleteTodo(id: number): void {
  getDb().prepare("DELETE FROM TeamTodo WHERE id=?").run(id);
}
