"use client";

import { useEffect, useState } from "react";
import { AdminCard, Empty, Skeleton } from "@/components/admin-ui";
import { ProductPicker } from "@/components/product-picker";

interface Table { id: number; name: string; seats: number; status: string; captain: string }
interface Ticket { id: number; no: string; tableId: number; tableName: string; captain: string; server: string; status: string; lines: { name: string; qty: number; note?: string }[] }

// Dine floor: tables, captain/server assignment, fire tickets to the kitchen.
export function DineConsole() {
  const [tables, setTables] = useState<Table[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [tname, setTname] = useState("");
  const [tcap, setTcap] = useState("");
  const [fireTable, setFireTable] = useState("");
  const [server, setServer] = useState("");
  const [lines, setLines] = useState<{ pid: string; qty: string; note: string }[]>([{ pid: "", qty: "1", note: "" }]);

  async function load() {
    const [t, k] = await Promise.all([
      fetch("/api/dine?tables=1").then((r) => r.json()).catch(() => null),
      fetch("/api/dine").then((r) => r.json()).catch(() => null),
    ]);
    if (t?.tables) setTables(t.tables);
    if (k?.tickets) setTickets(k.tickets.slice(0, 20));
    setLoaded(true);
  }

  useEffect(() => { void load(); }, []);

  async function addTable() {
    if (!tname.trim()) return;
    const res = await fetch("/api/dine", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "table", name: tname.trim(), captain: tcap.trim() }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Table ${tname.trim()} ready ✓` : (d.error ?? "failed"));
    if (res.ok) { setTname(""); setTcap(""); void load(); }
  }

  async function fire() {
    const clean = lines.filter((l) => l.pid && Number(l.qty) > 0)
      .map((l) => ({ productId: Number(l.pid), qty: Number(l.qty), ...(l.note.trim() ? { note: l.note.trim() } : {}) }));
    if (!fireTable || !clean.length) { setMsg("Pick a table and at least one line."); return; }
    const table = tables.find((t) => String(t.id) === fireTable);
    const res = await fetch("/api/dine", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "fire", tableId: Number(fireTable), lines: clean, captain: table?.captain ?? "", server: server.trim() }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Fired ${d.ticket?.no ?? ""} to kitchen ✓` : (d.error ?? "failed"));
    if (res.ok) { setLines([{ pid: "", qty: "1", note: "" }]); setServer(""); void load(); }
  }

  if (!loaded) return <Skeleton lines={5} />;
  return (
    <div className="grid gap-3">
      <AdminCard>
        <p className="font-bold">Tables ({tables.length}) <span className="text-xs font-normal text-zinc-500">(name + captain per table)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={tname} onChange={(e) => setTname(e.target.value)} placeholder="Table (T1, Family 4…)" maxLength={40}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={tcap} onChange={(e) => setTcap(e.target.value)} placeholder="Captain (optional)" maxLength={120}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void addTable()} disabled={!tname.trim()}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Add table</button>
        </div>
        {tables.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
            {tables.map((t) => (
              <li key={t.id} className={`rounded-full border px-3 py-1.5 ${t.status === "busy" ? "border-amber-500/50 font-bold" : "border-black/15 dark:border-white/20"}`}>
                {t.name}{t.captain ? ` · ${t.captain}` : ""}{t.status === "busy" ? " · busy" : ""}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Fire to kitchen</p>
        <div className="mt-2 grid gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            <select value={fireTable} onChange={(e) => setFireTable(e.target.value)} aria-label="Table"
              className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20">
              <option value="">Table…</option>
              {tables.map((t) => <option key={t.id} value={t.id}>{t.name}{t.status === "busy" ? " (busy)" : ""}</option>)}
            </select>
            <input value={server} onChange={(e) => setServer(e.target.value)} placeholder="Server (optional)" maxLength={120}
              className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          </div>
          {lines.map((l, i) => (
            <div key={i} className="flex flex-wrap gap-1.5">
              <div className="min-w-[140px] flex-1"><ProductPicker value={l.pid} placeholder="Dish…" onPick={(x) => setLines((ss) => ss.map((y, j) => (j === i ? { ...y, pid: x ? String(x.id) : "" } : y)))} /></div>
              <input value={l.qty} onChange={(e) => setLines((ss) => ss.map((y, j) => (j === i ? { ...y, qty: e.target.value } : y)))} placeholder="Qty" inputMode="decimal"
                className="min-h-[44px] w-20 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
              <input value={l.note} onChange={(e) => setLines((ss) => ss.map((y, j) => (j === i ? { ...y, note: e.target.value } : y)))} placeholder="Note (no onion…)" maxLength={120}
                className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
              {lines.length > 1 && (
                <button onClick={() => setLines((ss) => ss.filter((_, j) => j !== i))} aria-label="Remove line"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/15 dark:border-white/20">✕</button>
              )}
            </div>
          ))}
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setLines((ss) => [...ss, { pid: "", qty: "1", note: "" }])}
              className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">+ Line</button>
            <button onClick={() => void fire()}
              className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white">Fire 🔥</button>
          </div>
        </div>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Latest tickets ({tickets.length})</p>
        {tickets.length === 0 ? <div className="mt-2"><Empty>No tickets yet.</Empty></div> : (
          <ul className="mt-2 space-y-1 text-sm">
            {tickets.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span><b>{k.no}</b> · {k.tableName || `table #${k.tableId}`} · {k.status}</span>
                <span className="text-xs text-zinc-500">{k.lines.map((l) => `${l.name}×${l.qty}`).join(", ").slice(0, 80)}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      {msg && <p className="text-sm text-zinc-500">{msg}</p>}
    </div>
  );
}
