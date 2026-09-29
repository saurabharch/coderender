"use client";

import { useMemo } from "react";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

// Live campaign scheduler: current month + next month, Mon/Wed/Fri scheduled.
function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  return cells;
}

function scheduled(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month, day).getDay();
  return dow === 1 || dow === 3 || dow === 5;
}

export function CampaignCalendar() {
  const now = new Date();
  const months = useMemo(() => {
    const cur = { y: now.getFullYear(), m: now.getMonth() };
    const nxt = { y: now.getFullYear(), m: now.getMonth() + 1 };
    if (nxt.m > 11) { nxt.m = 0; nxt.y += 1; }
    return [cur, nxt];
  }, [now.getFullYear(), now.getMonth()]);
  const total = months.reduce((s, { y, m }) => s + monthGrid(y, m).filter((d) => d && scheduled(y, m, d)).length, 0);

  return (
    <div>
      <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
        <span className="relative flex h-2 w-2">
          <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
        </span>
        ● {total} posts scheduled
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {months.map(({ y, m }, mi) => (
          <div key={`${y}-${m}`} className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-black">
            <p className="text-sm font-extrabold">
              {new Date(y, m, 1).toLocaleString("en-IN", { month: "long" })} · Content Calendar {mi === 1 && <span className="text-xs font-semibold text-zinc-500">next</span>}
            </p>
            <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-zinc-500">
              {DAYS.map((d, i) => <span key={i}>{d}</span>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {monthGrid(y, m).map((d, i) =>
                d === null ? <span key={i} /> : (
                  <span
                    key={i}
                    style={{ animationDelay: `${Math.min(i * 25, 800)}ms` }}
                    className={`flex aspect-square items-center justify-center rounded-lg text-[11px] ${scheduled(y, m, d) ? "animate-[calIn_.4s_ease-out_both] bg-brand-soft font-bold text-brand-deep dark:bg-white/10" : "text-zinc-500"}`}
                  >
                    {d}
                  </span>
                )
              )}
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes calIn { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}
