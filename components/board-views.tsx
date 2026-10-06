"use client";

import { Plus } from "lucide-react"
import { useEffect, useMemo, useState } from "react";
import { MultiSelect } from "@mantine/core";
import { NoSsr } from "@/components/no-ssr";
import { AvatarInitials, IconBtn } from "@/components/admin-ux";
import { addDays, barSpan, dayKey, groupByDay, monthGrid, parseSlotDay, type CalTask } from "@/lib/calendar-core";
import { priorityBadge } from "@/lib/kanban-core";
import type { BoardTask } from "@/lib/kanban";

type View = "day" | "week" | "month" | "year" | "gantt";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Meeting { id: number; name: string; mode: string; slot: string; status: string; day: string | null }

function toCal(t: BoardTask, desig: Record<string, string>): CalTask {
  return {
    id: t.id, title: t.title, startAt: t.startAt, dueAt: t.dueAt, doneAt: t.doneAt,
    priority: t.priority, assigneeEmail: t.assigneeEmail, designation: desig[t.assigneeEmail] ?? "",
  };
}

function weekDays(cursor: string): string[] {
  const d = new Date(`${cursor}T12:00:00`);
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return dayKey(x);
  });
}

export function BoardViews({ boardId, initialTasks, columns, designations, boardNames }: {
  boardId: number;
  initialTasks: BoardTask[];
  columns: { id: number; name: string }[];
  designations: Record<string, string>;
  boardNames?: Record<number, string>;
}) {
  const [view, setView] = useState<View>("month");
  const today = useMemo(() => dayKey(new Date()), []);
  const [cursor, setCursor] = useState(today);
  const [tasks, setTasks] = useState<BoardTask[]>(initialTasks);
  const [sync, setSync] = useState<Record<string, { day: string }>>({});
  const [gcal, setGcal] = useState<{ connected: boolean; configured: boolean } | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [msg, setMsg] = useState("");
  const [quickDay, setQuickDay] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  // filters
  const [fAssignees, setFAssignees] = useState<string[]>([]);
  const [fDesig, setFDesig] = useState("");
  const [fPriority, setFPriority] = useState("");

  async function reload() {
    const d = await fetch(`/api/kanban/boards/${boardId}`).then((r) => r.json()).catch(() => null);
    if (d?.board?.tasks) setTasks(d.board.tasks);
  }

  async function loadMeta() {
    const s = await fetch(`/api/gcal/state?board=${boardId}`).then((r) => r.json()).catch(() => null);
    if (s?.state) setSync(s.state);
    const g = await fetch("/api/gcal/sync").then((r) => r.json()).catch(() => null);
    if (g) setGcal(g);
    const m = await fetch("/api/meetings/upcoming").then((r) => r.json()).catch(() => null);
    if (m?.meetings) setMeetings(m.meetings);
  }

  useEffect(() => { void loadMeta(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const assignees = useMemo(() => [...new Set(tasks.map((t) => t.assigneeEmail).filter(Boolean))], [tasks]);
  const desigs = useMemo(() => [...new Set(assignees.map((a) => designations[a]).filter(Boolean))], [assignees, designations]);

  const cal = useMemo(() => tasks
    .filter((t) => !t.archived)
    .filter((t) => fAssignees.length === 0 || fAssignees.includes(t.assigneeEmail))
    .filter((t) => !fDesig || (designations[t.assigneeEmail] ?? "") === fDesig)
    .filter((t) => !fPriority || t.priority === fPriority)
    .map((t) => toCal(t, designations)), [tasks, designations, fAssignees, fDesig, fPriority]);
  const byDay = useMemo(() => groupByDay(cal), [cal]);
  const meetByDay = useMemo(() => {
    const out: Record<string, Meeting[]> = {};
    for (const m of meetings) {
      if (!m.day) continue;
      (out[m.day] ??= []).push(m);
    }
    return out;
  }, [meetings]);

  async function push() {
    setMsg("Syncing…");
    const res = await fetch("/api/gcal/sync", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "push", boardId }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Pushed ${(d.ran ?? []).length} job(s).` : (d.error ?? "Sync failed."));
  }

  async function quickAdd() {
    if (!quickDay || !quickTitle.trim()) return;
    const res = await fetch("/api/kanban/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId, title: quickTitle.trim().slice(0, 160), dueAt: quickDay }),
    });
    if (res.ok) {
      setQuickTitle("");
      setQuickDay(null);
      void reload();
    }
  }

  const canPlan = boardId > 0;
  const colName = (id: number) => columns.find((c) => c.id === id)?.name ?? "";
  const taskCols = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t.columnId])), [tasks]);
  const taskBoards = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t.boardId])), [tasks]);
  const where = (columnId: number, taskId?: number) =>
    boardNames && taskId !== undefined ? (boardNames[taskBoards[taskId]] ?? "") : colName(columnId);
  const [cy, cm] = cursor.split("-").map(Number);
  const cells = monthGrid(cy, cm);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Views">
        {(["day", "week", "month", "year", "gantt"] as View[]).map((v) => (
          <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
            className={`min-h-[44px] rounded-full px-4 text-sm font-semibold capitalize ${view === v ? "bg-brand text-white" : "border border-black/15 dark:border-white/20"}`}>
            {v}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1 text-xs">
          {gcal && boardId > 0 && (gcal.connected
            ? <button onClick={() => void push()} className="min-h-[44px] rounded-xl border border-black/15 px-3 font-semibold dark:border-white/20">⇅ Push to Google</button>
            : <button onClick={async () => {
              const d = await fetch("/api/gcal/connect").then((r) => r.json()).catch(() => ({}));
              if (d.url) window.location.href = d.url as string;
              else setMsg(d.note ?? "Google keys missing.");
            }} className="min-h-[44px] rounded-xl border border-black/15 px-3 font-semibold dark:border-white/20">Connect Google</button>)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
        <NoSsr fallback={
          <label className="flex min-h-[44px] items-center gap-1">Who
            <select multiple value={fAssignees} onChange={(e) => setFAssignees([...e.target.selectedOptions].map((o) => o.value))}
              aria-label="Filter by team member"
              className="min-h-[44px] max-w-[160px] rounded-xl border border-black/15 bg-transparent px-2 dark:border-white/20">
              {assignees.map((a) => <option key={a} value={a}>{a.split("@")[0]}</option>)}
            </select>
          </label>
        }>
          <MultiSelect data={assignees.map((a) => ({ value: a, label: a.split("@")[0] }))} value={fAssignees} onChange={setFAssignees}
            placeholder={assignees.length > 0 ? "Everyone" : "No assignees"} aria-label="Filter by team member"
            clearable searchable size="sm" className="min-w-[140px]" />
        </NoSsr>
        {desigs.length > 0 && (
          <label className="flex min-h-[44px] items-center gap-1">Role
            <select value={fDesig} onChange={(e) => setFDesig(e.target.value)}
              className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 dark:border-white/20">
              <option value="">All roles</option>
              {desigs.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        )}
        <label className="flex min-h-[44px] items-center gap-1">Priority
          <select value={fPriority} onChange={(e) => setFPriority(e.target.value)}
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 dark:border-white/20">
            <option value="">All</option>
            {["urgent", "high", "medium", "low"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        {(fAssignees.length > 0 || fDesig || fPriority) && (
          <button onClick={() => { setFAssignees([]); setFDesig(""); setFPriority(""); }}
            className="min-h-[44px] rounded-xl px-2 text-zinc-500">Clear ×</button>
        )}
      </div>
      {msg && <p className="mt-1 text-xs text-zinc-500">{msg}</p>}
      {canPlan && quickDay && (
        <div className="mt-2 flex gap-1 rounded-2xl border border-brand/40 bg-brand/5 p-2">
          <input value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void quickAdd(); }}
            placeholder={`New task for ${quickDay}…`} maxLength={160} autoFocus
            className="min-h-[44px] w-full rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <IconBtn label="Add" onClick={() => void quickAdd()} disabled={!quickTitle.trim()} tone="brand"><Plus size={20} /></IconBtn>
          <button onClick={() => { setQuickDay(null); setQuickTitle(""); }} aria-label="Cancel"
            className="min-h-[44px] shrink-0 rounded-xl border border-black/15 px-3 text-sm dark:border-white/20">✕</button>
        </div>
      )}

      {view === "day" && (
        <DayView day={cursor} setDay={setCursor} tasks={byDay[cursor] ?? []} meetings={meetByDay[cursor] ?? []}
          sync={sync} colName={where} canPlan={canPlan} onPlan={(d) => { setCursor(d); setQuickDay(d); }} taskCols={taskCols} />
      )}
      {view === "week" && (
        <WeekView cursor={cursor} setCursor={setCursor} byDay={byDay} meetings={meetByDay}
          sync={sync} colName={where} taskCols={taskCols}
          canPlan={canPlan} onPlan={(d) => setQuickDay(d)} />
      )}
      {view === "month" && (
        <div className="mt-2">
          <MonthNav cursor={cursor} setCursor={setCursor} step="month" label={`${MONTHS[cm - 1]} ${cy}`} />
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-zinc-500">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((day, i) => (
              <div key={i}
                className={`min-h-[56px] rounded-xl border p-1 align-top ${!day ? "border-transparent" : day === today ? "border-brand bg-brand/5" : "border-black/10 dark:border-white/10"}`}>
                {day && (
                  <>
                    <span className="flex items-center justify-between">
                      <button onClick={() => { setCursor(day); setView("day"); }} className="min-h-[32px] min-w-[32px] text-xs font-bold">{Number(day.slice(8))}</button>
                      {canPlan && (
                        <button onClick={() => setQuickDay(day)} aria-label={`Plan task on ${day}`}
                          className="flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full text-sm opacity-60 hover:opacity-100">+</button>
                      )}
                    </span>
                    {(byDay[day] ?? []).slice(0, 2).map((t) => (
                      <span key={t.id} className="mt-0.5 hidden truncate rounded bg-black/10 px-1 text-[11px] min-[420px]:block dark:bg-white/15">
                        {sync[t.id] ? "📅 " : ""}{t.title}
                      </span>
                    ))}
                    {(meetByDay[day] ?? []).slice(0, 1).map((m) => (
                      <span key={m.id} className="mt-0.5 hidden truncate rounded bg-sky-500/20 px-1 text-[11px] min-[420px]:block">🎙 {m.slot || m.name}</span>
                    ))}
                    {(() => {
                      const n = (byDay[day] ?? []).length + (meetByDay[day] ?? []).length;
                      if (n === 0) return null;
                      return (
                        <>
                          <span className="mt-1 flex items-center justify-center gap-1 min-[420px]:hidden" aria-hidden="true">
                            {[0, 1, 2].slice(0, Math.min(3, n)).map((i) => (
                              <i key={i} className="h-1.5 w-1.5 rounded-full bg-brand" />
                            ))}
                          </span>
                          {n > 3 && <span className="block text-center text-[11px] text-zinc-500">+{n - 3}</span>}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 min-[420px]:hidden">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{cursor} agenda</p>
            <ul className="mt-1 space-y-1">
              {(meetByDay[cursor] ?? []).map((m) => (
                <li key={`m${m.id}`} className="truncate rounded-xl bg-sky-500/15 px-3 py-2 text-sm font-semibold">🎙 {m.slot || m.name} · {m.mode}</li>
              ))}
              {(byDay[cursor] ?? []).map((t) => (
                <li key={t.id} className="flex items-center gap-2 truncate rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10">
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  <span className="shrink-0 text-[11px] text-zinc-500">{t.startAt || t.dueAt || ""}</span>
                </li>
              ))}
              {(byDay[cursor] ?? []).length === 0 && (meetByDay[cursor] ?? []).length === 0 && (
                <li className="text-sm text-zinc-500">Nothing this day — tap + on any date to plan.</li>
              )}
            </ul>
          </div>
        </div>
      )}
      {view === "year" && (
        <div className="mt-2">
          <MonthNav cursor={cursor} setCursor={setCursor} step="year" label={String(cy)} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MONTHS.map((m, mi) => {
              const grid = monthGrid(cy, mi + 1);
              const n = grid.filter((d) => d && (byDay[d] ?? []).length).length;
              return (
                <button key={m} onClick={() => { setCursor(`${cy}-${String(mi + 1).padStart(2, "0")}-01`); setView("month"); }}
                  className="rounded-2xl border border-black/10 p-2 text-left dark:border-white/10">
                  <p className="text-sm font-bold">{m} <span className="text-xs font-normal text-zinc-500">{n ? `${n}d` : ""}</span></p>
                  <div className="mt-1 grid grid-cols-7 gap-px">
                    {grid.map((d, i) => (
                      <span key={i} className={`aspect-square rounded-sm ${d ? ((byDay[d] ?? []).length ? "bg-brand" : "bg-black/10 dark:bg-white/15") : "bg-transparent"}`} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {view === "gantt" && <Gantt tasks={cal} sync={sync} colName={where} taskCols={taskCols} />}
    </div>
  );
}

function MonthNav({ cursor, setCursor, step, label }: {
  cursor: string; setCursor: (d: string) => void; step: "month" | "year"; label: string;
}) {
  const shift = (n: number) => {
    const [y, m] = cursor.split("-").map(Number);
    if (step === "year") setCursor(`${y + n}-01-01`);
    else {
      const d = new Date(y, m - 1 + n, 1);
      setCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
    }
  };
  return (
    <div className="mb-2 flex items-center gap-2">
      <button onClick={() => shift(-1)} aria-label="Previous" className="min-h-[44px] min-w-[44px] rounded-xl border border-black/15 dark:border-white/20">‹</button>
      <b>{label}</b>
      <button onClick={() => shift(1)} aria-label="Next" className="min-h-[44px] min-w-[44px] rounded-xl border border-black/15 dark:border-white/20">›</button>
    </div>
  );
}

function who(t: CalTask): string {
  if (!t.assigneeEmail) return "Unassigned";
  const name = t.assigneeEmail.split("@")[0];
  return t.designation ? `${name} · ${t.designation}` : name;
}

function MeetList({ meetings }: { meetings: { slot: string; name: string; mode: string }[] }) {
  if (!meetings.length) return null;
  return (
    <ul className="mt-1 space-y-1">
      {meetings.map((m, i) => (
        <li key={i} className="rounded-xl bg-sky-500/15 px-2 py-1.5 text-xs font-semibold">🎙 {m.slot || m.name} · {m.mode}</li>
      ))}
    </ul>
  );
}

function DayView({ day, setDay, tasks, meetings, sync, colName, taskCols, canPlan, onPlan }: {
  day: string; setDay: (d: string) => void; tasks: CalTask[]; meetings: Meeting[];
  sync: Record<string, { day: string }>; colName: (id: number, taskId?: number) => string;
  taskCols: Record<number, number>; canPlan: boolean; onPlan: (d: string) => void;
}) {
  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setDay(addDays(day, -1))} aria-label="Previous day" className="min-h-[44px] min-w-[44px] rounded-xl border border-black/15 dark:border-white/20">‹</button>
        <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)}
          className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <button onClick={() => setDay(addDays(day, 1))} aria-label="Next day" className="min-h-[44px] min-w-[44px] rounded-xl border border-black/15 dark:border-white/20">›</button>
        <b className="text-sm">{tasks.length} tasks · {meetings.length} meetings</b>
        {canPlan && <button onClick={() => onPlan(day)} className="ml-auto min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white">+ Plan this day</button>}
      </div>
      <MeetList meetings={meetings} />
      <ul className="mt-2 space-y-1">
        {tasks.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-black/10 p-2 text-sm dark:border-white/10">
            <span className="rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-bold dark:bg-white/15">{colName(taskCols[t.id] ?? 0, t.id)}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${priorityBadge(t.priority)}`}>{t.priority}</span>
            <b>{t.title}</b>
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              {t.assigneeEmail ? <AvatarInitials name={t.assigneeEmail.split("@")[0]} size="sm" /> : null}
              {who(t)}{sync[t.id] ? " · 📅 synced" : ""}
            </span>
          </li>
        ))}
        {tasks.length === 0 && meetings.length === 0 && <li className="text-sm text-zinc-500">Nothing scheduled — plan the day above.</li>}
      </ul>
    </div>
  );
}

function WeekView({ cursor, setCursor, byDay, meetings, sync, colName, taskCols, canPlan, onPlan }: {
  cursor: string; setCursor: (d: string) => void; byDay: Record<string, CalTask[]>;
  meetings: Record<string, Meeting[]>; sync: Record<string, { day: string }>;
  colName: (id: number, taskId?: number) => string; taskCols: Record<number, number>; canPlan: boolean; onPlan: (d: string) => void;
}) {
  const days = weekDays(cursor);
  return (
    <div className="mt-2">
      <MonthNav cursor={cursor} setCursor={(d) => setCursor(d.slice(0, 7) === cursor.slice(0, 7) ? cursor : d)} step="month" label={`Week of ${days[0].slice(5)} → ${days[6].slice(5)}`} />
      <div className="grid gap-1 md:grid-cols-7">
        {days.map((d) => (
          <div key={d} className="rounded-2xl border border-black/10 p-1.5 dark:border-white/10">
            <span className="flex items-center justify-between">
              <b className="text-xs">{d.slice(5)}</b>
              {canPlan && (
                <button onClick={() => onPlan(d)} aria-label={`Plan task on ${d}`}
                  className="flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full text-sm opacity-60 hover:opacity-100">+</button>
              )}
            </span>
            <ul className="mt-1 space-y-1">
              {(byDay[d] ?? []).map((t) => (
                <li key={t.id} className="truncate rounded bg-black/10 px-1.5 py-1 text-[11px] dark:bg-white/15" title={t.title}>
                  <span className="font-semibold text-zinc-500">[{colName(taskCols[t.id] ?? 0, t.id)}]</span> {t.title}
                </li>
              ))}
              {(meetings[d] ?? []).map((m) => (
                <li key={`m${m.id}`} className="truncate rounded bg-sky-500/20 px-1.5 py-1 text-[11px]" title={m.slot}>🎙 {m.slot || m.name}</li>
              ))}
              {(byDay[d] ?? []).length === 0 && (meetings[d] ?? []).length === 0 && (
                <li className="px-1 py-1 text-[11px] text-zinc-400">—</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Gantt({ tasks, sync, colName, taskCols }: {
  tasks: CalTask[]; sync: Record<string, { day: string }>;
  colName: (id: number, taskId?: number) => string; taskCols: Record<number, number>;
}) {
  const dated = tasks.filter((t) => t.dueAt || t.startAt);
  if (!dated.length) return <p className="mt-2 text-sm text-zinc-500">No dated tasks — add start/due dates on cards for the timeline.</p>;
  const days = dated.flatMap((t) => [t.startAt || t.dueAt, t.dueAt || t.startAt]).filter(Boolean).sort();
  const from = addDays(days[0].slice(0, 10), -2);
  const to = addDays(days[days.length - 1].slice(0, 10), 4);
  return (
    <div className="mt-2 overflow-x-auto overscroll-x-contain pb-1">
      <div className="min-w-[560px] space-y-1.5">
        {dated.map((t) => {
          const s = barSpan((t.startAt || t.dueAt).slice(0, 10), (t.dueAt || t.startAt).slice(0, 10), from, to);
          return (
            <div key={t.id} className="grid grid-cols-[140px_1fr] items-center gap-2 text-xs">
              <span className="truncate font-semibold" title={t.title}>
                <span className="mr-1 rounded bg-black/10 px-1 text-[10px] dark:bg-white/15">{colName(taskCols[t.id] ?? 0, t.id)}</span>{t.title}
              </span>
              <span className="relative h-7 rounded-lg bg-black/10 dark:bg-white/10">
                <span title={`${t.startAt || "?"} → ${t.dueAt || "?"} · ${who(t)}${sync[t.id] ? " · synced" : ""}`}
                  className={`absolute top-1 h-5 rounded-md ${t.doneAt ? "bg-emerald-500" : "bg-brand"}`}
                  style={{ left: `${s.left}%`, width: `${s.width}%` }} />
              </span>
            </div>
          );
        })}
        <p className="text-[11px] text-zinc-500">{from} → {to} · hover a bar for owner</p>
      </div>
    </div>
  );
}

export { parseSlotDay };
