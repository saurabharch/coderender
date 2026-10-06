"use client";

import { Plus } from "lucide-react"
import { useEffect, useState } from "react";
import { AdminCard, Empty, Skeleton } from "@/components/admin-ui";
import { ProductPicker } from "@/components/product-picker";

interface Level { id: number; name: string; sku: string; lowAt: number; qty: number }
interface PO { id: number; supplier: string; status: string; grand: number }
interface Supplier { id: number; name: string }
interface Bin { id: number; floor: string; rack: string; shelf: string; code: string }

export function StockConsole() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [pos, setPos] = useState<PO[]>([]);
  const [sups, setSups] = useState<Supplier[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [pid, setPid] = useState("");
  const [qty, setQty] = useState("");
  const [mvop, setMvop] = useState("receive");
  const [sname, setSname] = useState("");
  const [posup, setPosup] = useState("");
  const [popid, setPopid] = useState("");
  const [poqty, setPoqty] = useState("");
  const [pocost, setPocost] = useState("");
  const [binloc, setBinloc] = useState("");

  async function load() {
    const [l, p, s, b] = await Promise.all([
      fetch("/api/stock/levels").then((r) => r.json()).catch(() => null),
      fetch("/api/stock/purchase").then((r) => r.json()).catch(() => null),
      fetch("/api/stock/places?what=suppliers").then((r) => r.json()).catch(() => null),
      fetch("/api/stock/bins").then((r) => r.json()).catch(() => null),
    ]);
    if (l?.levels) setLevels(l.levels);
    if (p?.orders) setPos(p.orders);
    if (s?.suppliers) setSups(s.suppliers);
    if (b?.bins) setBins(b.bins);
    setLoaded(true);
  }

  useEffect(() => { void load(); }, []);

  async function receive() {
    const n = Number(qty);
    const res = await fetch("/api/stock/levels", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mvop === "adjust"
        ? { op: mvop, productId: Number(pid), delta: n, ref: "admin console" }
        : { op: mvop, productId: Number(pid), qty: Math.abs(n), ref: "admin console" }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `${mvop} ✓ level now ${d.level}` : (d.error ?? "move failed"));
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

  async function createPO() {
    const res = await fetch("/api/stock/purchase", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: Number(posup),
        lines: [{ productId: Number(popid), qty: Number(poqty), cost: Math.round(Number(pocost) * 100) }],
      }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `PO #${d.id} drafted ✓` : (d.error ?? "failed"));
    if (res.ok) { setPosup(""); setPopid(""); setPoqty(""); setPocost(""); void load(); }
  }

  async function poStep(id: number, to: string) {
    const res = await fetch("/api/stock/purchase", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, to }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `${to} ✓` : (d.error ?? "failed"));
    if (res.ok) void load();
  }

  async function addBin() {
    const [floor, rack, shelf] = binloc.split("/").map((s) => s.trim());
    const res = await fetch("/api/stock/bins", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ floor, rack, shelf }),
    });
    setMsg(res.ok ? "Bin added ✓" : "failed");
    if (res.ok) { setBinloc(""); void load(); }
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
        <p className="font-bold">Stock move <span className="text-xs font-normal text-zinc-500">(product id + qty)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <select value={mvop} onChange={(e) => setMvop(e.target.value)} aria-label="Move type"
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
            {[["receive", "Receive"], ["adjust", "Adjust ±"], ["damage", "Damage"], ["expiry", "Expiry"], ["purchase-return", "Purchase return"], ["sale-return", "Sale return"]].map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <ProductPicker value={pid} shortcut="F4" placeholder="Product…" onPick={(x) => setPid(x ? String(x.id) : "")} />
          <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty (− ok for adjust)" inputMode="decimal"
            className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void receive()} disabled={!pid || !qty}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Apply</button>
        </div>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Levels ({levels.length})</p>
        {levels.length === 0 ? <div className="mt-2"><Empty>No physical products yet — add them in Shop.</Empty></div> : (
          <ul className="mt-2 space-y-1 text-sm">
            {levels.map((l) => (
              <li key={l.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 ${l.qty <= l.lowAt ? "border-amber-500/50" : "border-black/10 dark:border-white/10"}`}>
                <span className="min-w-0 flex-1 truncate">#{l.id} {l.name}</span>
                <span className="shrink-0 font-semibold">{l.qty}{l.qty <= l.lowAt ? " ⚠" : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">New purchase order <span className="text-xs font-normal text-zinc-500">(supplier + one line; pipeline continues via API)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={posup} onChange={(e) => setPosup(e.target.value)} placeholder="Supplier id" inputMode="numeric"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <ProductPicker value={popid} shortcut="F7" placeholder="Product…" onPick={(x) => setPopid(x ? String(x.id) : "")} />
          <input value={poqty} onChange={(e) => setPoqty(e.target.value)} placeholder="Qty" inputMode="decimal"
            className="min-h-[44px] w-20 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={pocost} onChange={(e) => setPocost(e.target.value)} placeholder="₹ cost" inputMode="decimal"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void createPO()} disabled={!posup || !popid || !poqty || !pocost}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Draft PO</button>
        </div>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Bins ({bins.length}) <span className="text-xs font-normal text-zinc-500">(floor/rack/shelf)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={binloc} onChange={(e) => setBinloc(e.target.value)} placeholder="G/A/3" maxLength={40}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void addBin()} disabled={!binloc.trim()}
            className="flex min-h-[44px] min-w-[52px] items-center justify-center rounded-xl bg-brand px-4 text-white disabled:opacity-40" aria-label="Add"><Plus size={20} /></button>
        </div>
        {bins.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
            {bins.map((b) => <li key={b.id} className="rounded-full border border-black/15 px-3 py-1.5 font-mono dark:border-white/20">{b.code}</li>)}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Purchase orders ({pos.length})</p>
        {pos.length === 0 ? <div className="mt-2"><Empty>No POs yet — draft one above.</Empty></div> : (
          <ul className="mt-2 space-y-1 text-sm">
            {pos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span>#{p.id} · {p.supplier || "?"} · ₹{(p.grand / 100).toFixed(0)}</span>
                <span className="flex items-center gap-1">
                  <b className="text-xs">{p.status}</b>
                  {(p.status === "draft" ? ["sent"] : p.status === "sent" ? ["cancelled"] : [] as string[]).map((to) => (
                    <button key={to} onClick={() => void poStep(p.id, to)}
                      className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">{to}</button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Suppliers ({sups.length})</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={sname} onChange={(e) => setSname(e.target.value)} placeholder="Supplier name" maxLength={120}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void addSupplier()} disabled={!sname.trim()}
            className="flex min-h-[44px] min-w-[52px] items-center justify-center rounded-xl bg-brand px-4 text-white disabled:opacity-40" aria-label="Add"><Plus size={20} /></button>
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
