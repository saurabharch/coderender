"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, barSpan, dayKey, groupByDay, monthGrid, type CalTask } from "@/lib/calendar-core";
import { priorityBadge } from "@/lib/kanban-core";
import type { BoardTask } from "@/lib/kanban";

type View = "day" | "month" | "year" | "gantt";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toCal(t: BoardTask, desig: Record<string, string>): CalTask {
  return {
    id: t.id, title: t.title, startAt: t.startAt, dueAt: t.dueAt, doneAt: t.doneAt,
    priority: t.priority, assigneeEmail: t.assigneeEmail, designation: desig[t.assigneeEmail] ?? "",
  };
}

export function BoardViews({ tasks, boardId, designations }: {
  tasks: BoardTask[]; boardId: number; designations: Record<string, string>;
}) {
  const [view, setView] = useState<View>("month");
  const today = useMemo(() => dayKey(new Date()), []);
  const [cursor, setCursor] = useState(today);
  const [sync, setSync] = useState<Record<string, { day: string }>>({});
  const [gcal, setGcal] = useState<{ connected: boolean; configured: boolean } | null>(null);
  const [msg, setMsg] = useState("");

  const cal = useMemo(() => tasks.filter((t) => !t.archived).map((t) => toCal(t, designations)), [tasks, designations]);
  const byDay = useMemo(() => groupByDay(cal), [cal]);

  async function loadSync() {
    const s = await fetch(`/api/gcal/state?board=${boardId}`).then((r) => r.json()).catch(() => null);
    if (s?.state) setSync(s.state);
    const g = await fetch("/api/gcal/sync").then((r) => r.json()).catch(() => null);
    if (g) setGcal(g);
  }

  useEffect(() => { void loadSync(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function push() {
    setMsg("Syncing…");
    const res = await fetch("/api/gcal/sync", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "push", boardId }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Pushed ${d.pushed?.length ?? 0} events.` : (d.error ?? "Sync failed."));
    void loadSync();
  }

  const [cy, cm] = cursor.split("-").map(Number);
  const cells = monthGrid(cy, cm);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Views">
        {(["day", "month", "year", "gantt"] as View[]).map((v) => (
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
      {msg && <p className="mt-1 text-xs text-zinc-500">{msg}</p>}

      {view === "day" && (
        <DayView day={cursor} setDay={setCursor} tasks={byDay[cursor] ?? []} sync={sync} />
      )}
      {view === "month" && (
        <div className="mt-2">
          <MonthNav cursor={cursor} setCursor={setCursor} step="month" label={`${MONTHS[cm - 1]} ${cy}`} />
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-zinc-500">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((day, i) => (
              <button key={i} disabled={!day} onClick={() => { if (day) { setCursor(day); setView("day"); } }}
                className={`min-h-[56px] rounded-xl border p-1 text-left align-top ${!day ? "border-transparent" : day === today ? "border-brand bg-brand/5" : "border-black/10 dark:border-white/10"}`}>
                {day && (
                  <>
                    <span className="text-xs font-bold">{Number(day.slice(8))}</span>
                    {(byDay[day] ?? []).slice(0, 2).map((t) => (
                      <span key={t.id} className="mt-0.5 block truncate rounded bg-black/10 px-1 text-[11px] dark:bg-white/15">
                        {sync[t.id] ? "📅 " : ""}{t.title}
                      </span>
                    ))}
                    {(byDay[day] ?? []).length > 2 && <span className="text-[11px] text-zinc-500">+{(byDay[day] ?? []).length - 2}</span>}
                  </>
                )}
              </button>
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
      {view === "gantt" && <Gantt tasks={cal} sync={sync} />}
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

function DayView({ day, setDay, tasks, sync }: {
  day: string; setDay: (d: string) => void; tasks: CalTask[]; sync: Record<string, { day: string }>;
}) {
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <button onClick={() => setDay(addDays(day, -1))} aria-label="Previous day" className="min-h-[44px] min-w-[44px] rounded-xl border border-black/15 dark:border-white/20">‹</button>
        <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)}
          className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <button onClick={() => setDay(addDays(day, 1))} aria-label="Next day" className="min-h-[44px] min-w-[44px] rounded-xl border border-black/15 dark:border-white/20">›</button>
        <b className="text-sm">{tasks.length} tasks</b>
      </div>
      <ul className="mt-2 space-y-1">
        {tasks.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-black/10 p-2 text-sm dark:border-white/10">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${priorityBadge(t.priority)}`}>{t.priority}</span>
            <b>{t.title}</b>
            <span className="text-xs text-zinc-500">{who(t)}{sync[t.id] ? " · 📅 synced" : ""}</span>
          </li>
        ))}
        {tasks.length === 0 && <li className="text-sm text-zinc-500">Nothing scheduled — set due dates on cards.</li>}
      </ul>
    </div>
  );
}

function Gantt({ tasks, sync }: { tasks: CalTask[]; sync: Record<string, { day: string }> }) {
  const dated = tasks.filter((t) => t.dueAt || t.startAt);
  if (!dated.length) return <p className="mt-2 text-sm text-zinc-500">No dated tasks — add start/due dates on cards for the timeline.</p>;
  const days = dated.flatMap((t) => [t.startAt || t.dueAt, t.dueAt || t.startAt]).filter(Boolean).sort();
  const from = addDays(days[0], -2);
  const to = addDays(days[days.length - 1], 4);
  return (
    <div className="mt-2 overflow-x-auto">
      <div className="min-w-[560px] space-y-1.5">
        {dated.map((t) => {
          const s = barSpan(t.startAt || t.dueAt, t.dueAt || t.startAt, from, to);
          return (
            <div key={t.id} className="grid grid-cols-[140px_1fr] items-center gap-2 text-xs">
              <span className="truncate font-semibold" title={t.title}>{t.title}</span>
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

