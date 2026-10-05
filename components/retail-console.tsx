"use client";

import { useEffect, useState } from "react";
import { AdminCard, Empty, Skeleton } from "@/components/admin-ui";

interface Campaign { id: number; name: string; channel: string; segment: string; status: string }
interface Shipment { id: number; orderId: number; courier: string; tracking: string; status: string }

export function RetailConsole() {
  const [camps, setCamps] = useState<Campaign[]>([]);
  const [ships, setShips] = useState<Shipment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [cname, setCname] = useState("");
  const [cmsg, setCmsg] = useState("");
  const [opening, setOpening] = useState("");
  const [drawer, setDrawer] = useState<{ status: string; opening: number } | null>(null);
  const [shoid, setShoid] = useState("");
  const [shcourier, setShcourier] = useState("");
  const [spid, setSpid] = useState("");
  const [sqty, setSqty] = useState("1");
  const [smethod, setSmethod] = useState("cash");
  const [scash, setScash] = useState("");

  async function load() {
    const [c, s, d] = await Promise.all([
      fetch("/api/retail/campaigns").then((r) => r.json()).catch(() => null),
      fetch("/api/retail/ship").then((r) => r.json()).catch(() => null),
      fetch("/api/retail/pos").then((r) => r.json()).catch(() => null),
    ]);
    if (c?.campaigns) setCamps(c.campaigns);
    if (s?.shipments) setShips(s.shipments);
    if (d) setDrawer(d.drawer);
    setLoaded(true);
  }

  useEffect(() => { void load(); }, []);

  async function addCampaign() {
    const res = await fetch("/api/retail/campaigns", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cname, channel: "whatsapp", segment: "active", message: cmsg || "Offer for you: {{coupon}} from CodeRender!" }),
    });
    setMsg(res.ok ? "Campaign drafted ✓ (launch via API run)" : "failed");
    if (res.ok) { setCname(""); setCmsg(""); void load(); }
  }

  async function launch(id: number) {
    const res = await fetch("/api/retail/campaigns", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, launch: true }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Launched ✓ sent ${d.sent}` : (d.error ?? "failed"));
    void load();
  }

  async function open() {
    const res = await fetch("/api/retail/pos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "drawer", opening: Math.round(Number(opening) * 100) }),
    });
    setMsg(res.ok ? "Drawer open ✓" : "failed");
    if (res.ok) { setOpening(""); void load(); }
  }

  async function quickSale() {
    const res = await fetch("/api/retail/pos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        op: "sale", lines: [{ productId: Number(spid), qty: Number(sqty) || 1 }],
        method: smethod, cashIn: smethod === "cash" && scash ? Math.round(Number(scash) * 100) : 0,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Sold ✓ order #${d.orderId}${d.change ? ` · change ₹${(d.change / 100).toFixed(0)}` : ""}` : (d.error ?? "sale failed"));
    if (res.ok) { setSpid(""); setSqty("1"); setScash(""); void load(); }
  }

  async function createShip() {
    const res = await fetch("/api/retail/ship", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: Number(shoid), courier: shcourier }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Shipment #${d.id} created ✓ (advance via API)` : (d.error ?? "failed"));
    if (res.ok) { setShoid(""); setShcourier(""); void load(); }
  }

  async function settle() {    const counted = prompt("Counted cash (₹)?");
    if (!counted) return;
    const res = await fetch("/api/retail/pos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "settle", counted: Math.round(Number(counted) * 100) }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Settled ✓ expected ₹${(d.expected / 100).toFixed(0)}, diff ₹${(d.diff / 100).toFixed(0)}` : (d.error ?? "failed"));
    void load();
  }

  if (!loaded) return <Skeleton lines={5} />;
  return (
    <div className="grid gap-3">
      <AdminCard>
        <p className="font-bold">Counter drawer {drawer ? <span className="text-xs font-normal text-zinc-500">({drawer.status} · opening ₹{(drawer.opening / 100).toFixed(0)})</span> : <span className="text-xs font-normal text-zinc-500">(closed)</span>}</p>
        {!drawer || drawer.status !== "open" ? (
          <div className="mt-2 flex gap-1.5">
            <input value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="Opening ₹" inputMode="decimal"
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
            <button onClick={() => void open()} disabled={!opening}
              className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Open</button>
          </div>
        ) : (
          <button onClick={() => void settle()} className="mt-2 min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Day-end settle</button>
        )}
        <p className="mt-1 text-xs text-zinc-500">Counter sales: POST /api/retail/pos {"{op:'sale', lines, method}"} — confirm + payment + change in one call.</p>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Quick sale <span className="text-xs font-normal text-zinc-500">(counter checkout)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={spid} onChange={(e) => setSpid(e.target.value)} placeholder="Product id" inputMode="numeric"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={sqty} onChange={(e) => setSqty(e.target.value)} placeholder="Qty" inputMode="decimal"
            className="min-h-[44px] w-20 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <select value={smethod} onChange={(e) => setSmethod(e.target.value)}
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
            <option value="cash">cash</option>
            <option value="upi">upi</option>
            <option value="card">card</option>
          </select>
          {smethod === "cash" && (
            <input value={scash} onChange={(e) => setScash(e.target.value)} placeholder="Tendered ₹" inputMode="decimal"
              className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          )}
          <button onClick={() => void quickSale()} disabled={!spid}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Sell</button>
        </div>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">New campaign</p>
        <div className="mt-2 grid gap-1.5">
          <input value={cname} onChange={(e) => setCname(e.target.value)} placeholder="Name (Diwali WA blast)" maxLength={120}
            className="min-h-[44px] w-full rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={cmsg} onChange={(e) => setCmsg(e.target.value)} placeholder="Message — {{name}} {{coupon}} work as variables" maxLength={1000}
            className="min-h-[44px] w-full rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void addCampaign()} disabled={!cname.trim()}
            className="min-h-[44px] w-fit rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Draft</button>
        </div>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Campaigns ({camps.length})</p>
        {camps.length === 0 ? <div className="mt-2"><Empty>No campaigns yet.</Empty></div> : (
          <ul className="mt-2 space-y-1 text-sm">
            {camps.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span>#{c.id} {c.name} · {c.channel} → {c.segment} · {c.status}</span>
                {c.status === "draft" && (
                  <button onClick={() => void launch(c.id)} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Launch</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Shipments ({ships.length})</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={shoid} onChange={(e) => setShoid(e.target.value)} placeholder="Order id" inputMode="numeric"
            className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={shcourier} onChange={(e) => setShcourier(e.target.value)} placeholder="Courier" maxLength={60}
            className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void createShip()} disabled={!shoid}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Ship</button>
        </div>
        {ships.length === 0 ? <div className="mt-2"><Empty>No shipments — create via API with an order id.</Empty></div> : (
          <ul className="mt-2 space-y-1 text-sm">
            {ships.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span>#{s.id} · order #{s.orderId} · {s.courier || "—"} {s.tracking || ""}</span>
                <span className="font-semibold">{s.status}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      {msg && <p className="break-words text-sm text-zinc-500">{msg}</p>}
    </div>
  );
}
