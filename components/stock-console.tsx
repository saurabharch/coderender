"use client";

import { useEffect, useState } from "react";
import { AdminCard, Empty, Skeleton } from "@/components/admin-ui";

interface Level { id: number; name: string; sku: string; lowAt: number; qty: number }
interface PO { id: number; supplier: string; status: string; grand: number }
interface Supplier { id: number; name: string }

export function StockConsole() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [pos, setPos] = useState<PO[]>([]);
  const [sups, setSups] = useState<Supplier[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [pid, setPid] = useState("");
  const [qty, setQty] = useState("");
  const [sname, setSname] = useState("");

  async function load() {
    const [l, p, s] = await Promise.all([
      fetch("/api/stock/levels").then((r) => r.json()).catch(() => null),
      fetch("/api/stock/purchase").then((r) => r.json()).catch(() => null),
      fetch("/api/stock/places?what=suppliers").then((r) => r.json()).catch(() => null),
    ]);
    if (l?.levels) setLevels(l.levels);
    if (p?.orders) setPos(p.orders);
    if (s?.suppliers) setSups(s.suppliers);
    setLoaded(true);
  }

  useEffect(() => { void load(); }, []);

  async function receive() {
    const res = await fetch("/api/stock/levels", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "receive", productId: Number(pid), qty: Number(qty), ref: "admin console" }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Received ✓ level now ${d.level}` : (d.error ?? "receive failed"));
    if (res.ok) { setPid(""); setQty(""); void load(); }
  }

  async function addSupplier() {
    const res = await fetch("/api/stock/places", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ what: "supplier", name: sname }),
    });
    setMsg(res.ok ? "Supplier added ✓" : "add failed");
    if (res.ok) { setSname(""); void load(); }
  }

  if (!loaded) return <Skeleton lines={5} />;
  const low = levels.filter((l) => l.qty <= l.lowAt);
  return (
    <div className="grid gap-3">
      {low.length > 0 && (
        <AdminCard className="border-amber-500/40">
          <p className="font-bold text-amber-700">Low stock ({low.length})</p>
          <p className="mt-1 text-sm">{low.map((l) => `${l.name} (${l.qty})`).join(" · ")}</p>
        </AdminCard>
      )}
      <AdminCard>
        <p className="font-bold">Receive stock <span className="text-xs font-normal text-zinc-500">(product id + qty)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={pid} onChange={(e) => setPid(e.target.value)} placeholder="Product id" inputMode="numeric"
            className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" inputMode="decimal"
            className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void receive()} disabled={!pid || !qty}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Receive</button>
        </div>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Levels ({levels.length})</p>
        {levels.length === 0 ? <div className="mt-2"><Empty>No physical products yet — add them in Shop.</Empty></div> : (
          <ul className="mt-2 space-y-1 text-sm">
            {levels.map((l) => (
              <li key={l.id} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${l.qty <= l.lowAt ? "border-amber-500/50" : "border-black/10 dark:border-white/10"}`}>
                <span className="min-w-0 truncate">#{l.id} {l.name}</span>
                <span className="shrink-0 font-semibold">{l.qty}{l.qty <= l.lowAt ? " ⚠" : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Purchase orders ({pos.length})</p>
        {pos.length === 0 ? <div className="mt-2"><Empty>No POs — create via API, full UI in a later pass.</Empty></div> : (
          <ul className="mt-2 space-y-1 text-sm">
            {pos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span>#{p.id} · {p.supplier || "?"} · ₹{(p.grand / 100).toFixed(0)}</span>
                <span className="font-semibold">{p.status}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Suppliers ({sups.length})</p>
        <div className="mt-2 flex gap-1.5">
          <input value={sname} onChange={(e) => setSname(e.target.value)} placeholder="Supplier name" maxLength={120}
            className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void addSupplier()} disabled={!sname.trim()}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Add</button>
        </div>
        {sups.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
            {sups.map((s) => <li key={s.id} className="rounded-full border border-black/15 px-3 py-1.5 dark:border-white/20">{s.name}</li>)}
          </ul>
        )}
      </AdminCard>
      {msg && <p className="text-sm text-zinc-500">{msg}</p>}
    </div>
  );
}
