"use client";

import { useEffect, useMemo, useState } from "react";
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

export function BoardViews({ boardId, initialTasks, columns, designations }: {
  boardId: number;
  initialTasks: BoardTask[];
  columns: { id: number; name: string }[];
  designations: Record<string, string>;
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
  const [fAssignee, setFAssignee] = useState("");
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
    .filter((t) => !fAssignee || t.assigneeEmail === fAssignee)
    .filter((t) => !fDesig || (designations[t.assigneeEmail] ?? "") === fDesig)
    .filter((t) => !fPriority || t.priority === fPriority)
    .map((t) => toCal(t, designations)), [tasks, designations, fAssignee, fDesig, fPriority]);
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

  const colName = (id: number) => columns.find((c) => c.id === id)?.name ?? "";
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
          {gcal && (gcal.connected
            ? <button onClick={() => void push()} className="min-h-[44px] rounded-xl border border-black/15 px-3 font-semibold dark:border-white/20">⇅ Push to Google</button>
            : <button onClick={async () => {
              const d = await fetch("/api/gcal/connect").then((r) => r.json()).catch(() => ({}));
              if (d.url) window.location.href = d.url as string;
              else setMsg(d.note ?? "Google keys missing.");
            }} className="min-h-[44px] rounded-xl border border-black/15 px-3 font-semibold dark:border-white/20">Connect Google</button>)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
        <label className="flex min-h-[44px] items-center gap-1">Who
          <select value={fAssignee} onChange={(e) => setFAssignee(e.target.value)}
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 dark:border-white/20">
            <option value="">Everyone</option>
            {assignees.map((a) => <option key={a} value={a}>{a.split("@")[0]}</option>)}
          </select>
        </label>
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
        {(fAssignee || fDesig || fPriority) && (
          <button onClick={() => { setFAssignee(""); setFDesig(""); setFPriority(""); }}
            className="min-h-[44px] rounded-xl px-2 text-zinc-500">Clear ×</button>
        )}
      </div>
      {msg && <p className="mt-1 text-xs text-zinc-500">{msg}</p>}
      {quickDay && (
        <div className="mt-2 flex gap-1 rounded-2xl border border-brand/40 bg-brand/5 p-2">
          <input value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void quickAdd(); }}
            placeholder={`New task for ${quickDay}…`} maxLength={160} autoFocus
            className="min-h-[44px] w-full rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void quickAdd()} disabled={!quickTitle.trim()}
            className="min-h-[44px] shrink-0 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">Add</button>
          <button onClick={() => { setQuickDay(null); setQuickTitle(""); }} aria-label="Cancel"
            className="min-h-[44px] shrink-0 rounded-xl border border-black/15 px-3 text-sm dark:border-white/20">✕</button>
        </div>
      )}

      {view === "day" && (
        <DayView day={cursor} setDay={setCursor} tasks={byDay[cursor] ?? []} meetings={meetByDay[cursor] ?? []}
          sync={sync} colName={colName} onPlan={(d) => { setCursor(d); setQuickDay(d); }} taskCols={Object.fromEntries(tasks.map((t) => [t.id, t.columnId]))} />
      )}
      {view === "week" && (
        <WeekView cursor={cursor} setCursor={setCursor} byDay={byDay} meetings={meetByDay}
          sync={sync} colName={colName} taskCols={Object.fromEntries(tasks.map((t) => [t.id, t.columnId]))}
          onPlan={(d) => setQuickDay(d)} />
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
                      <button onClick={() => setQuickDay(day)} aria-label={`Plan task on ${day}`}
                        className="flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full text-sm opacity-60 hover:opacity-100">+</button>
                    </span>
                    {(byDay[day] ?? []).slice(0, 2).map((t) => (
                      <span key={t.id} className="mt-0.5 block truncate rounded bg-black/10 px-1 text-[11px] dark:bg-white/15">
                        {sync[t.id] ? "📅 " : ""}{t.title}
                      </span>
                    ))}
                    {(meetByDay[day] ?? []).slice(0, 1).map((m) => (
                      <span key={m.id} className="mt-0.5 block truncate rounded bg-sky-500/20 px-1 text-[11px]">🎙 {m.slot || m.name}</span>
                    ))}
                    {(byDay[day] ?? []).length + (meetByDay[day] ?? []).length > 3 && (
                      <span className="text-[11px] text-zinc-500">+{(byDay[day] ?? []).length + (meetByDay[day] ?? []).length - 3}</span>
                    )}
                  </>
                )}
              </div>
            ))}
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
      {view === "gantt" && <Gantt tasks={cal} sync={sync} colName={colName} taskCols={Object.fromEntries(tasks.map((t) => [t.id, t.columnId]))} />}
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

function DayView({ day, setDay, tasks, meetings, sync, colName, taskCols, onPlan }: {
  day: string; setDay: (d: string) => void; tasks: CalTask[]; meetings: Meeting[];
  sync: Record<string, { day: string }>; colName: (id: number) => string;
  taskCols: Record<number, number>; onPlan: (d: string) => void;
}) {
  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setDay(addDays(day, -1))} aria-label="Previous day" className="min-h-[44px] min-w-[44px] rounded-xl border border-black/15 dark:border-white/20">‹</button>
        <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)}
          className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <button onClick={() => setDay(addDays(day, 1))} aria-label="Next day" className="min-h-[44px] min-w-[44px] rounded-xl border border-black/15 dark:border-white/20">›</button>
        <b className="text-sm">{tasks.length} tasks · {meetings.length} meetings</b>
        <button onClick={() => onPlan(day)} className="ml-auto min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white">+ Plan this day</button>
      </div>
      <MeetList meetings={meetings} />
      <ul className="mt-2 space-y-1">
        {tasks.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-black/10 p-2 text-sm dark:border-white/10">
            <span className="rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-bold dark:bg-white/15">{colName(taskCols[t.id] ?? 0)}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${priorityBadge(t.priority)}`}>{t.priority}</span>
            <b>{t.title}</b>
            <span className="text-xs text-zinc-500">{who(t)}{sync[t.id] ? " · 📅 synced" : ""}</span>
          </li>
        ))}
        {tasks.length === 0 && meetings.length === 0 && <li className="text-sm text-zinc-500">Nothing scheduled — plan the day above.</li>}
      </ul>
    </div>
  );
}

function WeekView({ cursor, setCursor, byDay, meetings, sync, colName, taskCols, onPlan }: {
  cursor: string; setCursor: (d: string) => void; byDay: Record<string, CalTask[]>;
  meetings: Record<string, Meeting[]>; sync: Record<string, { day: string }>;
  colName: (id: number) => string; taskCols: Record<number, number>; onPlan: (d: string) => void;
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
              <button onClick={() => onPlan(d)} aria-label={`Plan task on ${d}`}
                className="flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full text-sm opacity-60 hover:opacity-100">+</button>
            </span>
            <ul className="mt-1 space-y-1">
              {(byDay[d] ?? []).map((t) => (
                <li key={t.id} className="truncate rounded bg-black/10 px-1.5 py-1 text-[11px] dark:bg-white/15" title={t.title}>
                  <span className="font-semibold text-zinc-500">[{colName(taskCols[t.id] ?? 0)}]</span> {t.title}
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
  colName: (id: number) => string; taskCols: Record<number, number>;
}) {
  const dated = tasks.filter((t) => t.dueAt || t.startAt);
  if (!dated.length) return <p className="mt-2 text-sm text-zinc-500">No dated tasks — add start/due dates on cards for the timeline.</p>;
  const days = dated.flatMap((t) => [t.startAt || t.dueAt, t.dueAt || t.startAt]).filter(Boolean).sort();
  const from = addDays(days[0].slice(0, 10), -2);
  const to = addDays(days[days.length - 1].slice(0, 10), 4);
  return (
    <div className="mt-2 overflow-x-auto">
      <div className="min-w-[560px] space-y-1.5">
        {dated.map((t) => {
          const s = barSpan((t.startAt || t.dueAt).slice(0, 10), (t.dueAt || t.startAt).slice(0, 10), from, to);
          return (
            <div key={t.id} className="grid grid-cols-[140px_1fr] items-center gap-2 text-xs">
              <span className="truncate font-semibold" title={t.title}>
                <span className="mr-1 rounded bg-black/10 px-1 text-[10px] dark:bg-white/15">{colName(taskCols[t.id] ?? 0)}</span>{t.title}
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
