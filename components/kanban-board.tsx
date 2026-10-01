"use client";

import { useEffect, useState } from "react";
import { priorityBadge, type BoardAnalytics } from "@/lib/kanban-core";
import type { BoardDetail, BoardTask } from "@/lib/kanban";
import { CommentThread } from "./comment-thread";
import { MediaPicker } from "./media-picker";

interface FormOpt { id: number; title: string }

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "request failed");
  return data;
}

function initials(email: string): string {
  const name = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function TaskExtras({ taskId }: { taskId: number }) {
  const [items, setItems] = useState<{ id: number; label: string; done: number }[]>([]);
  const [label, setLabel] = useState("");
  const [openDiscuss, setOpenDiscuss] = useState<number | null>(null);

  async function load() {
    const d = await api(`/api/kanban/tasks/${taskId}/checklist`).catch(() => null);
    if (d?.items) setItems(d.items);
  }

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const done = items.filter((i) => i.done).length;

  return (
    <div className="grid gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10">
      <p className="text-sm font-bold">Checklist ({done}/{items.length})</p>
      {items.length > 0 && (
        <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div className="h-full bg-brand" style={{ width: `${(done / items.length) * 100}%` }} />
        </div>
      )}
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.id}>
            <div className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!it.done} aria-label={it.label}
                onChange={async (e) => {
                  await api("/api/kanban/tasks/checklist", { method: "PUT", body: JSON.stringify({ id: it.id, done: e.target.checked }) });
                  void load();
                }} className="h-5 w-5" />
              <span className={it.done ? "line-through opacity-60" : ""}>{it.label}</span>
              <button onClick={() => setOpenDiscuss((o) => (o === it.id ? null : it.id))}
                className="ml-auto min-h-[36px] rounded-lg border border-black/10 px-2 text-xs dark:border-white/15">💬</button>
              <button aria-label="Remove item" onClick={async () => {
                await api(`/api/kanban/tasks/checklist?id=${it.id}`, { method: "DELETE" });
                void load();
              }} className="min-h-[36px] px-1.5 text-xs opacity-60 hover:opacity-100">✕</button>
            </div>
            {openDiscuss === it.id && (
              <div className="mb-1 ml-7 mt-1">
                <CommentThread resourceType="kanban-todo" resourceId={String(it.id)} compact />
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="flex gap-1">
        <input value={label} onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && label.trim()) { void api(`/api/kanban/tasks/${taskId}/checklist`, { method: "POST", body: JSON.stringify({ label: label.trim() }) }).then(() => { setLabel(""); void load(); }); } }}
          placeholder="+ Add checklist item" maxLength={160}
          className="min-h-[44px] w-full rounded-xl border border-dashed border-black/20 bg-transparent px-3 text-sm dark:border-white/20" />
      </div>
      <div>
        <p className="text-sm font-bold">Discussion</p>
        <div className="mt-1">
          <CommentThread resourceType="kanban-task" resourceId={String(taskId)} compact />
        </div>
      </div>
    </div>
  );
}

export function KanbanBoard({ initial, forms }: { initial: BoardDetail; forms: FormOpt[] }) {
  const [board, setBoard] = useState(initial);
  const [stats, setStats] = useState<BoardAnalytics | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [newTask, setNewTask] = useState<Record<number, string>>({});
  const [editing, setEditing] = useState<BoardTask | null>(null);
  const [users, setUsers] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  async function reload() {
    const d = await api(`/api/kanban/boards/${initial.id}`).catch(() => null);
    if (d?.board) setBoard(d.board);
    const s = await api(`/api/kanban/boards/${initial.id}/analytics`).catch(() => null);
    if (s?.stats) setStats(s.stats);
    const u = await api("/api/kanban/users").catch(() => null);
    if (u?.users) setUsers(u.users.map((x: { email: string }) => x.email));
  }

  useEffect(() => { void reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function move(taskId: number, columnId: number, index?: number) {
    setBoard((b) => ({
      ...b,
      tasks: b.tasks.map((t) => (t.id === taskId ? { ...t, columnId } : t)),
    }));
    try {
      await api("/api/kanban/tasks/move", { method: "POST", body: JSON.stringify({ taskId, columnId, index }) });
      await reload();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "move failed");
      void reload();
    }
  }

  async function addTask(columnId: number) {
    const title = (newTask[columnId] ?? "").trim();
    if (!title) return;
    setNewTask((s) => ({ ...s, [columnId]: "" }));
    try {
      await api("/api/kanban/tasks", { method: "POST", body: JSON.stringify({ boardId: board.id, columnId, title }) });
      await reload();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "create failed");
    }
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      await api(`/api/kanban/tasks/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editing.title, body: editing.body, priority: editing.priority,
          assigneeEmail: editing.assigneeEmail, archived: !!editing.archived,
          attachments: editing.attachments ?? [],
        }),
      });
      setEditing(null);
      await reload();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "save failed");
    }
  }

  const maxCol = Math.max(1, ...board.columns.map((c) => board.tasks.filter((t) => t.columnId === c.id && !t.archived).length));

  return (
    <div>
      {notice && <p role="alert" className="mb-2 rounded-xl bg-red-500/10 p-2 text-sm text-red-700">{notice}</p>}

      {stats && (
        <section aria-label="Board analytics" className="grid gap-2 rounded-2xl border border-black/10 p-3 text-xs dark:border-white/10 md:grid-cols-4">
          <div><p className="font-semibold uppercase tracking-wider text-zinc-500">Open</p><p className="text-xl font-extrabold">{stats.total}</p></div>
          <div><p className="font-semibold uppercase tracking-wider text-zinc-500">Done 7d / 30d</p><p className="text-xl font-extrabold">{stats.done7d} / {stats.done30d}</p></div>
          <div><p className="font-semibold uppercase tracking-wider text-zinc-500">Avg cycle</p><p className="text-xl font-extrabold">{stats.avgCycleDays}d</p></div>
          <div>
            <p className="font-semibold uppercase tracking-wider text-zinc-500">Priority mix</p>
            <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              {stats.perPriority.map((p) => (
                <span key={p.priority} title={`${p.priority}: ${p.n}`} style={{ width: `${stats.total ? (p.n / stats.total) * 100 : 0}%` }}
                  className={p.priority === "urgent" ? "bg-red-500" : p.priority === "high" ? "bg-orange-500" : p.priority === "medium" ? "bg-yellow-500" : "bg-zinc-400"} />
              ))}
            </div>
          </div>
          <div className="md:col-span-4">
            <div className="flex items-end gap-1" aria-hidden>
              {board.columns.map((c) => {
                const n = board.tasks.filter((t) => t.columnId === c.id && !t.archived).length;
                return (
                  <div key={c.id} className="flex-1 text-center">
                    <div className="mx-auto w-3/4 rounded-t bg-brand/70" style={{ height: `${8 + (n / maxCol) * 40}px` }} title={`${c.name}: ${n}`} />
                    <p className="mt-1 truncate font-semibold">{c.name} · {n}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <label className="flex min-h-[44px] items-center gap-2">Linked form
          <select value={board.formId ?? ""} onChange={async (e) => {
            const formId = e.target.value ? Number(e.target.value) : null;
            await api(`/api/kanban/boards/${board.id}`, { method: "PUT", body: JSON.stringify({ formId }) }).catch(() => {});
            setBoard((b) => ({ ...b, formId }));
          }} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 dark:border-white/20">
            <option value="">— none —</option>
            {forms.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
          </select>
        </label>
        {board.formId != null && <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700">new submissions → tasks</span>}
        <button onClick={async () => {
          const name = prompt("New column name:");
          if (!name) return;
          await api(`/api/kanban/boards/${board.id}/columns`, { method: "POST", body: JSON.stringify({ name }) }).catch(() => {});
          void reload();
        }} className="ml-auto min-h-[44px] rounded-xl border border-black/15 px-4 font-semibold dark:border-white/20">+ Column</button>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {board.columns.map((c) => {
          const cards = board.tasks.filter((t) => t.columnId === c.id && !t.archived).sort((a, b) => a.ord - b.ord);
          return (
            <div key={c.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId != null) {
                  const ids = [...cards.map((t) => t.id)];
                  void move(dragId, c.id, ids.length);
                  setDragId(null);
                }
              }}
              className="rounded-2xl border border-black/10 bg-zinc-50/60 p-2 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-1 px-1">
                <b className="text-xs font-extrabold uppercase tracking-widest text-zinc-500">{c.name}</b>
                <span className="rounded-full bg-black/10 px-2 text-xs dark:bg-white/15">{cards.length}</span>
                <button aria-label={`Rename ${c.name}`} onClick={async () => {
                  const name = prompt("Rename column:", c.name);
                  if (!name || name === c.name) return;
                  await api(`/api/kanban/columns/${c.id}`, { method: "PUT", body: JSON.stringify({ name }) }).catch(() => {});
                  void reload();
                }} className="ml-auto p-2 text-xs opacity-60 hover:opacity-100">✎</button>
                <button aria-label={`Delete ${c.name}`} onClick={async () => {
                  if (!confirm(`Delete column "${c.name}"? Tasks move to the first column.`)) return;
                  await api(`/api/kanban/columns/${c.id}`, { method: "DELETE" }).catch(() => {});
                  void reload();
                }} className="p-2 text-xs opacity-60 hover:opacity-100">✕</button>
              </div>
              <div className="mt-1 space-y-2">
                {cards.map((t) => (
                  <article key={t.id} draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (dragId != null && dragId !== t.id) {
                        const ids = cards.map((x) => x.id).filter((x) => x !== dragId);
                        void move(dragId, c.id, ids.indexOf(t.id));
                        setDragId(null);
                      }
                    }}
                    className="cursor-grab rounded-xl border border-black/10 bg-white p-2.5 text-sm shadow-sm active:cursor-grabbing dark:border-white/10 dark:bg-zinc-900">
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 font-semibold leading-snug">{t.title}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${priorityBadge(t.priority)}`}>{t.priority}</span>
                    </div>
                    {t.body && <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{t.body}</p>}
                    <div className="mt-2 flex items-center gap-2">
                      {t.assigneeEmail ? (
                        <span title={t.assigneeEmail} className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">{initials(t.assigneeEmail)}</span>
                      ) : <span className="text-[11px] text-zinc-400">Unassigned</span>}
                      {t.submissionId != null && <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold text-sky-700">form #{t.submissionId}</span>}
                      <button onClick={() => setEditing(t)} className="ml-auto min-h-[36px] rounded-lg border border-black/10 px-2.5 text-xs dark:border-white/15">Open</button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="mt-2 flex gap-1 px-1">
                <input value={newTask[c.id] ?? ""} onChange={(e) => setNewTask((s) => ({ ...s, [c.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") void addTask(c.id); }}
                  placeholder={`+ Add in ${c.name}`} maxLength={160}
                  className="min-h-[44px] w-full rounded-xl border border-dashed border-black/20 bg-transparent px-3 text-sm dark:border-white/20" />
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <div role="dialog" aria-label="Edit task" className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
          <div className="grid max-h-[90vh] w-full max-w-lg gap-2 overflow-auto rounded-2xl bg-white p-4 dark:bg-zinc-900">
            <b>Edit task #{editing.id}</b>
            <label className="grid gap-1 text-sm">Title
              <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
            <label className="grid gap-1 text-sm">Notes
              <textarea value={editing.body} rows={3} onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                className="rounded-xl border border-black/15 bg-transparent px-3 py-2 dark:border-white/20" /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-sm">Priority
                <select value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: e.target.value })}
                  className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20">
                  <option value="low">Low</option><option value="medium">Medium</option>
                  <option value="high">High</option><option value="urgent">Urgent</option>
                </select></label>
              <label className="grid gap-1 text-sm">Assignee (email)
                <input value={editing.assigneeEmail} list="kanban-users" onChange={(e) => setEditing({ ...editing, assigneeEmail: e.target.value })}
                  className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
                <datalist id="kanban-users">{users.map((u) => <option key={u} value={u} />)}</datalist></label>
            </div>
            <label className="flex min-h-[44px] items-center gap-2 text-sm">
              <input type="checkbox" checked={!!editing.archived} onChange={(e) => setEditing({ ...editing, archived: e.target.checked ? 1 : 0 })} className="h-5 w-5" /> Archived</label>
            {editing.submissionId != null && <p className="text-xs text-zinc-500">From form submission #{editing.submissionId}.</p>}
            <TaskExtras taskId={editing.id} />
            <div className="grid gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10">
              <p className="text-sm font-bold">Attachments ({(editing.attachments ?? []).length}/5)</p>
              {(editing.attachments ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {editing.attachments.map((u) => (
                    <span key={u} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="attachment" className="h-16 w-16 rounded-xl border border-black/10 object-cover dark:border-white/10" />
                      <button aria-label="Remove attachment" onClick={() => setEditing({ ...editing, attachments: editing.attachments.filter((x) => x !== u) })}
                        className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white">✕</button>
                    </span>
                  ))}
                </div>
              )}
              <span className="flex flex-wrap gap-1">
                <label className="min-h-[44px] cursor-pointer rounded-xl border border-black/15 px-4 py-2.5 text-sm dark:border-white/20">Upload…
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const form = new FormData();
                    form.append("file", f);
                    const res = await fetch("/api/media/upload", { method: "POST", body: form }).catch(() => null);
                    const data = await res?.json().catch(() => ({}));
                    if (data?.url) setEditing({ ...editing, attachments: [...(editing.attachments ?? []), data.url].slice(0, 5) });
                    e.target.value = "";
                  }} />
                </label>
                <MediaPicker onSelect={(u) => setEditing({ ...editing, attachments: [...(editing.attachments ?? []), u].slice(0, 5) })} />
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => void saveEdit()} className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white">Save</button>
              <button onClick={() => setEditing(null)} className="min-h-[44px] rounded-xl border border-black/15 px-5 text-sm dark:border-white/20">Close</button>
              <button onClick={async () => {
                if (!confirm("Delete this task?")) return;
                await api(`/api/kanban/tasks/${editing.id}`, { method: "DELETE" }).catch(() => {});
                setEditing(null);
                void reload();
              }} className="ml-auto min-h-[44px] rounded-xl border border-red-500/40 px-5 text-sm text-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
