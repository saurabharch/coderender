"use client";

import { useEffect, useRef, useState } from "react";

interface Item {
  id: number; title: string; body: string; audience: string;
  kind: string; target: string; createdAt: string;
}

type Mode = "table" | "grid" | "list";

const KINDS = ["info", "ticket", "payout", "lead", "form", "comment", "kanban", "system"];

export function NotifyConsole() {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [kind, setKind] = useState("");
  const [audience, setAudience] = useState("");
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("table");
  const [seq, setSeq] = useState(0);
  const [stats, setStats] = useState<{ byKind: { kind: string; n: number }[]; byAudience: { audience: string; n: number }[] }>({ byKind: [], byAudience: [] });
  const [busy, setBusy] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const LIMIT = 20;

  async function fetchPage(off: number, append: boolean) {
    if (busy) return;
    setBusy(true);
    const d = await fetch(`/api/notify?limit=${LIMIT}&offset=${off}${kind ? `&kind=${kind}` : ""}${audience ? `&audience=${audience}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`)
      .then((r) => r.json()).catch(() => null);
    if (d?.items) {
      setItems((prev) => (append ? [...prev, ...d.items] : d.items));
      setTotal(d.total);
      setOffset(off + d.items.length);
      if (d.analytics) setStats(d.analytics);
    }
    setBusy(false);
  }

  useEffect(() => {
    setItems([]);
    setOffset(0);
    void fetchPage(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, audience, seq]);

  useEffect(() => {
    const el = moreRef.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => {
      if (es[0]?.isIntersecting && items.length < total) void fetchPage(offset, true);
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  });

  const maxKind = Math.max(1, ...stats.byKind.map((k) => k.n));

  return (
    <div>
      <div className="grid gap-2 rounded-2xl border border-black/10 p-3 text-xs dark:border-white/10 md:grid-cols-2">
        <div>
          <p className="font-semibold uppercase tracking-wider text-zinc-500">By type (30d)</p>
          {stats.byKind.map((k) => (
            <p key={k.kind} className="mt-0.5 flex items-center gap-2">
              <span className="w-20 truncate">{k.kind}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.round((k.n / maxKind) * 100)}%` }} />
              </span>
              <b className="w-8 text-right tabular-nums">{k.n}</b>
            </p>
          ))}
          {stats.byKind.length === 0 && <p className="text-zinc-500">No data yet.</p>}
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wider text-zinc-500">By audience (30d)</p>
          {stats.byAudience.map((a) => (
            <p key={a.audience} className="mt-0.5">👥 {a.audience}: <b>{a.n}</b></p>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") setSeq((s) => s + 1); }}
          placeholder="Search…" maxLength={120}
          className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter by type"
          className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
          <option value="">All types</option>
          {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select value={audience} onChange={(e) => setAudience(e.target.value)} aria-label="Filter by audience"
          className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
          <option value="">All audiences</option>
          <option value="team">team</option>
          <option value="all">all</option>
        </select>
        <span className="flex gap-1" role="tablist" aria-label="View">
          {(["table", "grid", "list"] as Mode[]).map((m) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
              className={`min-h-[44px] rounded-xl px-3 text-sm font-semibold capitalize ${mode === m ? "bg-brand text-white" : "border border-black/15 dark:border-white/20"}`}>{m}</button>
          ))}
        </span>
      </div>
      <p className="mt-1 text-xs text-zinc-500">{total} messages · scroll for more</p>

      {mode === "table" && (
        <div className="mt-2 overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead><tr className="border-b border-black/10 text-xs uppercase tracking-wider text-zinc-500 dark:border-white/10">
              <th className="px-3 py-2">Title</th><th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">To</th><th className="px-3 py-2">When</th>
            </tr></thead>
            <tbody>
              {items.map((n) => (
                <tr key={n.id} className="border-b border-black/5 align-top dark:border-white/5" title={n.body}>
                  <td className="px-3 py-2"><b>{n.title}</b><p className="mt-0.5 max-w-md truncate text-xs text-zinc-500">{n.body}</p></td>
                  <td className="px-3 py-2"><span className="rounded-full bg-black/10 px-2 py-0.5 text-xs dark:bg-white/15">{n.kind || "info"}</span></td>
                  <td className="px-3 py-2 font-mono text-xs">{n.target || n.audience}</td>
                  <td className="px-3 py-2 font-mono text-xs">{n.createdAt.slice(0, 16).replace("T", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {mode === "grid" && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {items.map((n) => (
            <div key={n.id} className="rounded-2xl border border-black/10 p-3 text-sm dark:border-white/10" title={n.body}>
              <p><b>{n.title}</b></p>
              <p className="mt-1 line-clamp-3 text-xs text-zinc-500">{n.body}</p>
              <p className="mt-1 font-mono text-[11px] text-zinc-500">{n.kind || "info"} → {n.target || n.audience} · {n.createdAt.slice(0, 16).replace("T", " ")}</p>
            </div>
          ))}
        </div>
      )}
      {mode === "list" && (
        <ul className="mt-2 space-y-1 text-sm">
          {items.map((n) => (
            <li key={n.id} className="flex flex-wrap items-baseline gap-2 border-b border-black/5 py-1.5 dark:border-white/5">
              <b className="min-w-0 flex-1 truncate">{n.title}</b>
              <span className="font-mono text-xs text-zinc-500">{n.kind || "info"} · {n.createdAt.slice(0, 16).replace("T", " ")}</span>
            </li>
          ))}
        </ul>
      )}
      {items.length === 0 && !busy && <p className="mt-2 text-sm text-zinc-500">Nothing matches.</p>}
      <div ref={moreRef} className="py-2 text-center text-xs text-zinc-500">
        {busy ? "Loading…" : items.length < total ? "Scroll for more" : total ? "End of list" : ""}
      </div>
    </div>
  );
}
