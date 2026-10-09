"use client";

import { useEffect, useState } from "react";
import { AdminCard, Empty, Skeleton } from "@/components/admin-ui";

interface Ticket {
  id: number; no: string; tableId: number; tableName: string;
  captain: string; server: string; status: string; createdAt: string;
  lines: { name: string; qty: number; note?: string }[];
}

// Kitchen display: open tickets, oldest first, advance with one tap.
// Polls every 15s; no sockets infra assumed.
export function KitchenBoard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [msg, setMsg] = useState("");

  async function load(quiet = false) {
    const d = await fetch("/api/dine").then((r) => r.json()).catch(() => null);
    if (d?.tickets) {
      setTickets((d.tickets as Ticket[]).filter((t) => !["served", "cancelled"].includes(t.status)));
    }
    if (!quiet) setMsg("");
  }

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(true), 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function move(id: number, to: string) {
    const res = await fetch("/api/dine", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "move", id, to }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `${to} ✓` : (d.error ?? "failed"));
    void load(true);
  }

  const next: Record<string, string> = { fired: "preparing", preparing: "ready", ready: "served" };
  const tone: Record<string, string> = {
    fired: "border-red-500/50",
    preparing: "border-amber-500/50",
    ready: "border-emerald-500/50",
  };

  return (
    <div className="grid gap-3">
      {tickets.length === 0 ? <AdminCard><Empty>All clear — no open tickets.</Empty></AdminCard> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tickets.map((k) => (
            <div key={k.id} className={`rounded-2xl border-2 bg-white p-4 dark:bg-zinc-950 ${tone[k.status] ?? "border-black/10 dark:border-white/10"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xl font-extrabold">{k.tableName || `T#${k.tableId}`}</p>
                <p className="font-mono text-xs text-zinc-500">{k.no}</p>
              </div>
              {(k.captain || k.server) && (
                <p className="mt-0.5 text-xs text-zinc-500">{[k.captain && `Capt ${k.captain}`, k.server && `Srv ${k.server}`].filter(Boolean).join(" · ")}</p>
              )}
              <ul className="mt-2 space-y-1">
                {k.lines.map((l, i) => (
                  <li key={i} className="flex justify-between gap-2 text-lg font-bold">
                    <span>{l.qty}× {l.name}{l.note ? <span className="ml-1 text-xs font-normal text-red-600">({l.note})</span> : ""}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 font-mono text-[11px] text-zinc-400">{k.createdAt.slice(0, 16).replace("T", " ")}</p>
              {next[k.status] && (
                <button onClick={() => void move(k.id, next[k.status])}
                  className="mt-2 min-h-[52px] w-full rounded-xl bg-brand text-base font-bold text-white">
                  {next[k.status] === "preparing" ? "Start preparing →" : next[k.status] === "ready" ? "Mark ready →" : "Mark served ✓"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {msg && <p className="text-sm text-zinc-500">{msg}</p>}
    </div>
  );
}
