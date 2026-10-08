"use client";

import { CopyBtn, IconBtn, StatusBadge } from "@/components/admin-ux";
import { maskInt } from "@/lib/mask";
import { buildTrackingUrl } from "@/lib/retail-core";
import { ageStatus } from "@/lib/credit-core";

import { useEffect, useState } from "react";
import { Phone, Plus } from "lucide-react"
import { AdminCard, Empty, Skeleton } from "@/components/admin-ui";

interface Campaign { id: number; name: string; channel: string; segment: string; status: string }
interface Shipment { id: number; orderId: number; courier: string; tracking: string; status: string }
interface Due { id: number; name: string; phone: string; balance: number; termsDays: number; balanceSince: string }

export function RetailConsole({ tab }: { tab: string }) {
  const [camps, setCamps] = useState<Campaign[]>([]);
  const [ships, setShips] = useState<Shipment[]>([]);
  const [dues, setDues] = useState<Due[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [cname, setCname] = useState("");
  const [cmsg, setCmsg] = useState("");
  const [opening, setOpening] = useState("");
  const [drawer, setDrawer] = useState<{ status: string; opening: number } | null>(null);
  const [shoid, setShoid] = useState("");
  const [shcourier, setShcourier] = useState("");
  const [couriers, setCouriers] = useState<{ id: number; name: string; url: string }[]>([]);
  const [coname, setConame] = useState("");
  const [courl, setCourl] = useState("");
  const [spid, setSpid] = useState("");
  const [sqty, setSqty] = useState("1");
  const [smethod, setSmethod] = useState("cash");
  const [scash, setScash] = useState("");

  async function load() {
    const [c, s, d, dr, co] = await Promise.all([
      fetch("/api/retail/campaigns").then((r) => r.json()).catch(() => null),
      fetch("/api/retail/ship").then((r) => r.json()).catch(() => null),
      fetch("/api/shop/credit").then((r) => r.json()).catch(() => null),
      fetch("/api/retail/pos").then((r) => r.json()).catch(() => null),
      fetch("/api/retail/ship?couriers=1").then((r) => r.json()).catch(() => null),
    ]);
    if (c?.campaigns) setCamps(c.campaigns);
    if (s?.shipments) setShips(s.shipments);
    if (co?.couriers) setCouriers(co.couriers);
    if (d?.dues) setDues(d.dues);
    if (dr) setDrawer(dr.drawer);
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

  async function addCourier() {
    const res = await fetch("/api/retail/ship", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ what: "courier", name: coname.trim(), url: courl.trim() }),
    });
    setMsg(res.ok ? "Courier saved ✓" : "failed");
    if (res.ok) { setConame(""); setCourl(""); void load(); }
  }

  async function delCourier(id: number) {
    await fetch("/api/retail/ship", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ what: "courier-del", id }),
    });
    void load();
  }

  function trackUrl(courier: string, tracking: string): string | null {
    const c = couriers.find((x) => x.name.toLowerCase() === courier.trim().toLowerCase());
    return c ? buildTrackingUrl(c.url, tracking) : null;
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
    setMsg(res.ok ? `Shipment #${d.id} created ✓` : (d.error ?? "failed"));
    if (res.ok) { setShoid(""); setShcourier(""); void load(); }
  }

  async function moveShip(id: number, to: string) {
    const res = await fetch("/api/retail/ship", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, to }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `${to} ✓` : (d.error ?? "failed"));
    if (res.ok) void load();
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

  async function collect(id: number) {
    const amt = prompt("Collected amount (₹)?");
    if (!amt) return;
    const res = await fetch("/api/shop/credit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "collect", customerId: id, amount: Math.round(Number(amt) * 100) }),
    });
    const r = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Collected ✓ ₹${(r.left / 100).toFixed(0)} left` : (r.error ?? "failed"));
    if (res.ok) void load();
  }

  async function setTerms(id: number, cur: number) {
    const days = prompt("Payment terms in days (0 = due on sale)?", String(cur));
    if (days === null) return;
    const res = await fetch("/api/shop/credit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "terms", customerId: id, days: Math.round(Number(days) || 0) }),
    });
    const r = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Terms saved ✓" : (r.error ?? "failed"));
    if (res.ok) void load();
  }

  async function writeOff(id: number, name: string) {
    const reason = prompt(`Write off ${name}'s due as bad debt (owner only)? Reason:`);
    if (!reason) return;
    const amt = prompt("Write-off amount (₹)?");
    if (!amt) return;
    const res = await fetch("/api/shop/credit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "writeoff", customerId: id, amount: Math.round(Number(amt) * 100), reason }),
    });
    const r = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Written off ✓ ₹${(r.left / 100).toFixed(0)} left` : (r.error ?? "failed"));
    if (res.ok) void load();
  }

  if (!loaded) return <Skeleton lines={5} />;
  return (
    <div className="grid gap-3">      {tab === "counter" && (<>
      <AdminCard>
        <p className="flex flex-wrap items-center gap-1.5 font-bold">Counter drawer {drawer ? <span className="flex items-center gap-1.5 text-xs font-normal text-zinc-500"><StatusBadge status={drawer.status} /> opening ₹{(drawer.opening / 100).toFixed(0)}</span> : <StatusBadge status="closed" />}</p>
        {!drawer || drawer.status !== "open" ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <input value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="Opening ₹" inputMode="decimal"
              className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
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
          <input value={spid} onChange={(e) => setSpid(maskInt(e.target.value))} placeholder="Product id" inputMode="numeric"
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
        <p className="font-bold">Udhari — dues ({dues.length})</p>
        {dues.length === 0 ? <div className="mt-2"><Empty>All settled — no dues.</Empty></div> : (
          <ul className="mt-2 space-y-1 text-sm">
            {dues.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span>{u.name} · <b>₹{(u.balance / 100).toFixed(0)}</b>
                  {(() => {
                    const st = ageStatus({ balance: u.balance, balanceSince: u.balanceSince || "", termsDays: u.termsDays || 0 });
                    return <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${st.overdue ? "bg-red-500/15 text-red-700 dark:text-red-300" : "bg-black/5 text-zinc-500 dark:bg-white/10"}`}>{st.label}{u.termsDays ? ` · ${u.termsDays}d terms` : ""}</span>;
                  })()}
                </span>
                <span className="flex flex-wrap gap-1">
                  {u.phone && (
                    <a href={`tel:${u.phone}`} aria-label={`Call ${u.name}`}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-brand text-white"><Phone size={17} /></a>
                  )}
                  <button onClick={() => void collect(u.id)}
                    className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Collect</button>
                  <button onClick={() => void setTerms(u.id, u.termsDays || 0)}
                    className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Terms</button>
                  <button onClick={() => void writeOff(u.id, u.name)}
                    className="min-h-[44px] rounded-xl border border-red-500/40 px-3 text-xs font-semibold text-red-700 dark:text-red-300">Write off</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      </>)}
      {tab === "marketing" && (<>
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
                <span className="flex flex-wrap items-center gap-1.5">#{c.id} {c.name} · {c.channel} → {c.segment} · <StatusBadge status={c.status} /></span>
                {c.status === "draft" && (
                  <button onClick={() => void launch(c.id)} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Launch</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      </>)}
      {tab === "shipments" && (<>
      <AdminCard>
        <p className="font-bold">Delivery partners ({couriers.length}) <span className="text-xs font-normal text-zinc-500">(tracking links)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={coname} onChange={(e) => setConame(e.target.value)} placeholder="Courier name" maxLength={60}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={courl} onChange={(e) => setCourl(e.target.value)} placeholder="Tracking URL (…{tracking}…)" maxLength={300}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 font-mono text-xs dark:border-white/20" />
          <IconBtn label="Add courier" onClick={() => void addCourier()} disabled={!coname.trim()} tone="brand"><Plus size={20} /></IconBtn>
        </div>
        {couriers.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {couriers.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span className="min-w-0 truncate">{c.name} <span className="font-mono text-xs text-zinc-500">{c.url || "no template"}</span></span>
                <button onClick={() => void delCourier(c.id)} aria-label={`Remove ${c.name}`}
                  className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">Remove</button>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Shipments ({ships.length})</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={shoid} onChange={(e) => setShoid(maskInt(e.target.value))} placeholder="Order id" inputMode="numeric"
            className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={shcourier} onChange={(e) => setShcourier(e.target.value)} placeholder="Courier" maxLength={60}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void createShip()} disabled={!shoid}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Ship</button>
        </div>
        {ships.length === 0 ? <div className="mt-2"><Empty>No shipments — create via API with an order id.</Empty></div> : (
          <ul className="mt-2 space-y-1 text-sm">
            {ships.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span className="flex min-w-0 flex-wrap items-center gap-1.5">#{s.id} · order #{s.orderId} · {s.courier || "—"} {s.tracking || ""} {s.tracking ? <CopyBtn value={s.tracking} label="tracking id" /> : null}
                  {s.tracking && trackUrl(s.courier, s.tracking) ? <a href={trackUrl(s.courier, s.tracking)!} target="_blank" rel="noreferrer" className="font-semibold text-brand-deep underline">Track ↗</a> : null}</span>
                <span className="flex items-center gap-1">
                  <StatusBadge status={s.status} />
                  {(s.status === "created" ? ["packed"] : s.status === "packed" ? ["shipped"] : s.status === "shipped" ? ["delivered", "rto"] : [] as string[]).map((to) => (
                    <button key={to} onClick={() => void moveShip(s.id, to)}
                      className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">{to}</button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      </>)}
      {msg && <p className="break-words text-sm text-zinc-500">{msg}</p>}
    </div>
  );
}
