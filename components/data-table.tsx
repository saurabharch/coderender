"use client";

import { Fragment, useMemo, useState } from "react";

export interface DTColumn {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "badge";
  editable?: boolean;
  options?: string[];
  hideable?: boolean;
}

export interface DTRow { id: number | string; [k: string]: unknown }

function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

interface EditState { id: number | string; key: string; value: string }

function CellInner({ c, ed, setEditing, onEdit }: {
  c: DTColumn; ed: EditState;
  setEditing: (e: EditState | null) => void;
  onEdit?: (id: number | string, key: string, value: string) => Promise<void>;
}) {
  if (ed) {
    return (
      <span className="flex gap-1">
        {c.options ? (
          <select value={ed.value} onChange={(e) => setEditing({ ...ed, value: e.target.value })}
            className="min-h-[44px] rounded-lg border border-black/15 bg-transparent px-2 dark:border-white/20">
            {c.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input value={ed.value} onChange={(e) => setEditing({ ...ed, value: e.target.value })}
            className="min-h-[44px] w-32 rounded-lg border border-black/15 bg-transparent px-2 dark:border-white/20" />
        )}
        <button aria-label="Save edit" onClick={async () => {
          if (onEdit) await onEdit(ed.id, ed.key, ed.value);
          setEditing(null);
        }} className="min-h-[44px] rounded-lg bg-brand px-3 text-xs font-bold text-white">✓</button>
        <button aria-label="Cancel edit" onClick={() => setEditing(null)} className="min-h-[44px] rounded-lg border border-black/15 px-3 text-xs dark:border-white/20">✕</button>
      </span>
    );
  }
  return null;
}

// Niko-spirit data table, zero deps: search, sort, faceted filters, column
// visibility, pagination, CSV export, row expansion, inline edit.
export function DataTable({ columns, rows, idKey = "id", searchKeys, facets, expand, onEdit, exportName, pageSize = 15 }: {
  columns: DTColumn[];
  rows: DTRow[];
  idKey?: string;
  searchKeys?: string[];
  facets?: { key: string; label: string }[];
  expand?: (row: DTRow) => React.ReactNode;
  onEdit?: (id: number | string, key: string, value: string) => Promise<void>;
  exportName?: string;
  pageSize?: number;
}) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [picked, setPicked] = useState<Record<string, Set<string>>>({});
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<(number | string) | null>(null);
  const [editing, setEditing] = useState<{ id: number | string; key: string; value: string } | null>(null);

  const keys = useMemo(() => searchKeys ?? columns.map((c) => c.key), [searchKeys, columns]);

  const facetValues = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const f of facets ?? []) {
      out[f.key] = [...new Set(rows.map((r) => cellText(r[f.key])).filter(Boolean))].sort().slice(0, 30);
    }
    return out;
  }, [rows, facets]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (needle && !keys.some((k) => cellText(r[k]).toLowerCase().includes(needle))) return false;
      for (const [k, set] of Object.entries(picked)) {
        if (set.size && !set.has(cellText(r[k]))) return false;
      }
      return true;
    });
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      out = [...out].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (col?.type === "number") return (Number(av) - Number(bv)) * sortDir;
        return cellText(av).localeCompare(cellText(bv)) * sortDir;
      });
    }
    return out;
  }, [rows, q, keys, picked, sortKey, sortDir, columns]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const view = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const visible = columns.filter((c) => !hidden.has(c.key));

  function toggleFacet(k: string, v: string) {
    setPicked((p) => {
      const next = { ...p, [k]: new Set(p[k] ?? []) };
      if (next[k].has(v)) next[k].delete(v);
      else next[k].add(v);
      return next;
    });
    setPage(0);
  }

  function toCSV() {
    const head = visible.map((c) => c.label).join(",");
    const lines = filtered.map((r) => visible.map((c) => `"${cellText(r[c.key]).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[head, ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${exportName ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search…" maxLength={200}
          className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        {exportName && (
          <button onClick={toCSV} className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Export CSV</button>
        )}
        <details className="relative">
          <summary className="min-h-[44px] cursor-pointer list-none rounded-xl border border-black/15 px-4 py-2.5 text-sm font-semibold dark:border-white/20">Columns</summary>
          <span className="absolute right-0 z-10 mt-1 grid w-44 gap-1 rounded-xl border border-black/10 bg-white p-2 dark:border-white/10 dark:bg-zinc-900">
            {columns.filter((c) => c.hideable !== false).map((c) => (
              <label key={c.key} className="flex min-h-[36px] items-center gap-2 text-sm">
                <input type="checkbox" checked={!hidden.has(c.key)} onChange={() => {
                  setHidden((h) => {
                    const n = new Set(h);
                    if (n.has(c.key)) n.delete(c.key);
                    else if (visible.length > 1) n.add(c.key);
                    return n;
                  });
                }} className="h-4 w-4" /> {c.label}
              </label>
            ))}
          </span>
        </details>
      </div>
      {(facets ?? []).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {facets!.map((f) => (
            <details key={f.key} className="relative">
              <summary className="min-h-[44px] cursor-pointer list-none rounded-full border border-black/15 px-4 py-2 text-xs font-semibold dark:border-white/20">
                {f.label}{(picked[f.key]?.size ?? 0) > 0 ? ` (${picked[f.key].size})` : ""}
              </summary>
              <span className="absolute left-0 z-10 mt-1 grid max-h-56 w-52 gap-0.5 overflow-auto rounded-xl border border-black/10 bg-white p-2 dark:border-white/10 dark:bg-zinc-900">
                {(facetValues[f.key] ?? []).map((v) => (
                  <label key={v} className="flex min-h-[36px] cursor-pointer items-center gap-2 rounded-lg px-2 text-sm hover:bg-black/5 dark:hover:bg-white/10">
                    <input type="checkbox" checked={picked[f.key]?.has(v) ?? false} onChange={() => toggleFacet(f.key, v)} className="h-4 w-4" />
                    <span className="truncate">{v}</span>
                  </label>
                ))}
              </span>
            </details>
          ))}
          {Object.values(picked).some((s) => s.size) && (
            <button onClick={() => { setPicked({}); setPage(0); }} className="min-h-[44px] rounded-full px-3 text-xs text-zinc-500">Clear ×</button>
          )}
        </div>
      )}
      <p className="mt-1 text-xs text-zinc-500">{filtered.length} rows</p>
      <div className="mt-1 overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10">
              {expand && <th className="w-10 px-2 py-2" />}
              {visible.map((c) => (
                <th key={c.key} className="px-3 py-2">
                  <button onClick={() => {
                    if (sortKey === c.key) setSortDir((d) => (d === 1 ? -1 : 1));
                    else { setSortKey(c.key); setSortDir(-1); }
                  }} className="font-semibold underline">
                    {c.label}{sortKey === c.key ? (sortDir === -1 ? " ↓" : " ↑") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((r) => (
              <Fragment key={r[idKey] as string | number}>
                <tr className="border-b border-black/5 dark:border-white/5">
                  {expand && (
                    <td className="px-2 py-2">
                      <button aria-label="Expand row" onClick={() => setOpen((o) => (o === r[idKey] ? null : r[idKey] as number | string))}
                        className="min-h-[36px] min-w-[36px] rounded-lg border border-black/10 dark:border-white/15">{open === r[idKey] ? "−" : "+"}</button>
                    </td>
                  )}
                  {visible.map((c) => {
                    const ed = editing && editing.id === r[idKey] && editing.key === c.key ? editing : null;
                    return (
                      <td key={c.key} className="px-3 py-2">
                        {ed ? (
                          <CellInner c={c} ed={ed} setEditing={setEditing} onEdit={onEdit} />
                        ) : (
                          <span className="flex items-center gap-1">
                            {c.type === "badge"
                              ? <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs dark:bg-white/15">{cellText(r[c.key])}</span>
                              : <span className={c.key === "name" || c.key === "title" ? "font-semibold" : ""}>{cellText(r[c.key])}</span>}
                            {c.editable && onEdit && (
                              <button aria-label={`Edit ${c.label}`} onClick={() => setEditing({ id: r[idKey] as number | string, key: c.key, value: cellText(r[c.key]) })}
                                className="p-1.5 text-xs opacity-50 hover:opacity-100">✎</button>
                            )}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
                {expand && open === r[idKey] && (
                  <tr className="border-b border-black/5 dark:border-white/5">
                    <td colSpan={visible.length + 1} className="bg-black/5 px-3 py-2 dark:bg-white/5">{expand(r)}</td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {view.length === 0 && <p className="mt-2 text-sm text-zinc-500">No rows match.</p>}
      <div className="mt-2 flex items-center gap-2 text-sm">
        <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="min-h-[44px] rounded-xl border border-black/15 px-4 disabled:opacity-40 dark:border-white/20">← Prev</button>
        <span className="text-xs text-zinc-500">Page {page + 1} of {pages}</span>
        <button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} className="min-h-[44px] rounded-xl border border-black/15 px-4 disabled:opacity-40 dark:border-white/20">Next →</button>
      </div>
    </div>
  );
}
