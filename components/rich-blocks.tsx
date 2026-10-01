"use client";

import { useMemo, useState } from "react";

export interface Block {
  kind: "table" | "links" | "buttons" | "bars";
  title?: string;
  columns?: string[];
  rows?: string[][];
  items?: { label: string; href: string }[];
  pairs?: { label: string; value: number }[];
}

// Renders markdown-lite links [text](url) as anchors.
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (!m) return <span key={i}>{p}</span>;
        const href = m[2];
        const safe = href.startsWith("/") || href.startsWith("https://wa.me");
        return safe ? (
          <a key={i} href={href} className="font-semibold text-brand-deep underline">{m[1]}</a>
        ) : (
          <span key={i}>{m[1]}</span>
        );
      })}
    </>
  );
}

function TableBlock({ columns = [], rows = [], title }: { columns?: string[]; rows?: string[][]; title?: string }) {
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const per = 5;
  const filtered = useMemo(() => {
    let r = rows.filter((row) => !q || row.join(" ").toLowerCase().includes(q.toLowerCase()));
    if (sort) {
      r = [...r].sort((a, b) => (a[sort.col] ?? "").localeCompare(b[sort.col] ?? "", undefined, { numeric: true }) * sort.dir);
    }
    return r;
  }, [rows, q, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / per));
  const slice = filtered.slice(page * per, (page + 1) * per);
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-black/10 dark:border-white/15">
      {title && <p className="bg-zinc-100 px-3 py-1.5 text-xs font-bold dark:bg-white/10">{title}</p>}
      <div className="p-2">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search table…"
          aria-label="Search table"
          className="mb-1 min-h-[36px] w-full rounded-lg border border-black/10 bg-transparent px-2 text-xs dark:border-white/15" />
        <table className="w-full text-left text-xs">
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={i} className="px-2 py-1">
                  <button onClick={() => setSort((s) => (s?.col === i && s.dir === 1 ? { col: i, dir: -1 } : { col: i, dir: 1 }))}
                    className="font-bold underline decoration-dotted" aria-label={`Sort by ${c}`}>
                    {c}{sort?.col === i ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((r, i) => (
              <tr key={i} className="border-t border-black/5 dark:border-white/10">
                {r.map((cell, j) => <td key={j} className="px-2 py-1.5 align-top">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="flex items-center justify-between px-1 pt-1 text-xs">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="min-h-[36px] px-2 font-bold disabled:opacity-40">← Prev</button>
            <span>{page + 1} / {pages}</span>
            <button disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="min-h-[36px] px-2 font-bold disabled:opacity-40">Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Blocks({ blocks }: { blocks?: Block[] }) {
  if (!blocks || blocks.length === 0) return null;
  return (
    <div className="mt-2 space-y-2">
      {blocks.map((b, i) => {
        if (b.kind === "table") return <TableBlock key={i} columns={b.columns} rows={b.rows} title={b.title} />;
        if (b.kind === "links" || b.kind === "buttons") {
          return (
            <div key={i} className="flex flex-wrap gap-1.5">
              {b.title && <p className="w-full text-xs font-bold">{b.title}</p>}
              {(b.items ?? []).map((x) => (
                <a key={x.label} href={x.href}
                  className={b.kind === "buttons"
                    ? "inline-flex min-h-[36px] items-center rounded-full bg-zinc-900 px-3 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900"
                    : "inline-flex min-h-[36px] items-center rounded-full border border-black/15 px-3 text-xs font-semibold dark:border-white/20"}>
                  {x.label}
                </a>
              ))}
            </div>
          );
        }
        if (b.kind === "bars") {
          const max = Math.max(1, ...(b.pairs ?? []).map((p) => p.value));
          return (
            <div key={i} className="space-y-1">
              {b.title && <p className="text-xs font-bold">{b.title}</p>}
              {(b.pairs ?? []).map((p) => (
                <div key={p.label} className="flex items-center gap-2 text-xs">
                  <span className="w-24 shrink-0 truncate">{p.label}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.round((p.value / max) * 100)}%` }} />
                  </span>
                  <b>{p.value}</b>
                </div>
              ))}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
