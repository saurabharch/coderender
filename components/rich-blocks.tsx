"use client";

import { useMemo, useState } from "react";

export interface Block {
  kind: "table" | "links" | "buttons" | "bars" | "service";
  title?: string;
  tagline?: string;
  columns?: string[];
  rows?: string[][];
  items?: { label: string; href: string }[];
  pairs?: { label: string; value: number }[];
  points?: string[];
  price?: string;
  href?: string;
}

// Renders markdown-lite links [text](url) as anchors, plus **bold**, *italic*,
// `code`, and "- " list lines. Escapes everything else (model output is untrusted).
export function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, li) => {
        const list = line.match(/^\s*[-*]\s+(.*)$/);
        const content = list ? list[1] : line;
        const parts = content.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
        return (
          <span key={li} className={list ? "block pl-3" : "block"}>
            {list ? "• " : null}
            {parts.map((p, i) => {
              const link = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
              if (link) {
                const href = link[2];
                const safe = href.startsWith("/") || href.startsWith("https://wa.me");
                return safe ? (
                  <a key={i} href={href} className="font-semibold text-brand-deep underline">{link[1]}</a>
                ) : (
                  <span key={i}>{link[1]}</span>
                );
              }
              const bold = p.match(/^\*\*([^*]+)\*\*$/);
              if (bold) return <strong key={i}>{bold[1]}</strong>;
              const ital = p.match(/^\*([^*]+)\*$/);
              if (ital) return <em key={i}>{ital[1]}</em>;
              const code = p.match(/^`([^`]+)`$/);
              if (code) return <code key={i} className="rounded bg-black/10 px-1 font-mono text-[13px] dark:bg-white/15">{code[1]}</code>;
              return <span key={i}>{p}</span>;
            })}
            {li < lines.length - 1 ? <br /> : null}
          </span>
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
        if (b.kind === "service") {
          return (
            <div key={i} className="rounded-xl border border-brand/30 bg-brand-soft/50 p-3 dark:bg-white/5">
              <p className="text-sm font-extrabold">{b.title}</p>
              {b.tagline && <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">{b.tagline}</p>}
              {(b.points ?? []).length > 0 && (
                <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs">
                  {(b.points ?? []).map((p) => <li key={p}>{p}</li>)}
                </ul>
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-zinc-500">{b.price}</span>
                {b.href && <a href={b.href} className="inline-flex min-h-[36px] items-center rounded-full bg-zinc-900 px-3 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900">Explore →</a>}
              </div>
            </div>
          );
        }
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
