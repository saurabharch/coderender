"use client";

import { useState } from "react";

// Auto-suggest service mapping: type to filter, tick to link.
export function ServicePicker({ services, selected = [] }: {
  services: { id: number; title: string; category: string }[]; selected?: number[];
}) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = services.filter((s) =>
    !needle || s.title.toLowerCase().includes(needle) || s.category.toLowerCase().includes(needle));
  const cats = [...new Set(shown.map((s) => s.category))];
  return (
    <span className="grid gap-1 text-sm">Services included
      <input value={q} onChange={(e) => setQ(e.target.value)} type="search" enterKeyHint="search" autoComplete="off" placeholder="Type to suggest… (e.g. seo)"
        maxLength={60} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
      <span className="grid max-h-[50vh] gap-0.5 overflow-y-auto overscroll-contain rounded-xl border border-black/15 p-2 dark:border-white/20">
        {cats.map((c) => (
          <span key={c}>
            <b className="text-xs uppercase tracking-wider text-zinc-500">{c}</b>
            {shown.filter((s) => s.category === c).map((s) => (
              <label key={s.id} className="flex min-h-[36px] cursor-pointer items-center gap-2 rounded-lg px-2 text-sm hover:bg-black/5 dark:hover:bg-white/10">
                <input type="checkbox" name="serviceIds" value={s.id} defaultChecked={selected.includes(s.id)} className="h-4 w-4" />
                {s.title}
              </label>
            ))}
          </span>
        ))}
        {shown.length === 0 && <span className="px-2 text-xs text-zinc-500">No match — try another word.</span>}
      </span>
    </span>
  );
}
