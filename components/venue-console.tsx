"use client";

import { useEffect, useState } from "react";
import { AdminCard, Empty, Skeleton } from "@/components/admin-ui";

interface Venue {
  id: number; name: string; kind: string; address: string; capacity: number;
  amenities: string; status: string;
  rates?: { id: number; label: string; amount: number; unit: string }[];
}

const KINDS = ["hotel", "hall", "resort", "apartment", "room"] as const;

// Venues across profiles: one form, profile-driven labels, rates per venue.
export function VenueConsole() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<string>("hall");
  const [capacity, setCapacity] = useState("");
  const [amenities, setAmenities] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Venue | null>(null);
  const [rlabel, setRlabel] = useState("");
  const [sdate, setSdate] = useState("");
  const [stime, setStime] = useState("18:00");
  const [etime, setEtime] = useState("22:00");
  const [sdays, setSdays] = useState<number[]>([6]);
  const [suntil, setSuntil] = useState("");
  const [ramt, setRamt] = useState("");
  const [runit, setRunit] = useState("event");

  async function load() {
    const d = await fetch("/api/venues").then((r) => r.json()).catch(() => null);
    if (d?.venues) setVenues(d.venues);
    setLoaded(true);
  }

  useEffect(() => { void load(); }, []);

  async function save() {
    if (!name.trim()) return;
    const res = await fetch("/api/venues", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        op: "venue", name: name.trim(), kind,
        ...(capacity.trim() ? { capacity: Math.round(Number(capacity) || 0) } : {}),
        ...(amenities.trim() ? { amenities: amenities.trim() } : {}),
      }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Venue saved ✓ #${d.id}` : (d.error ?? "failed"));
    if (res.ok) { setName(""); setCapacity(""); setAmenities(""); void load(); }
  }

  async function open(id: number) {
    if (openId === id) { setOpenId(null); setDetail(null); return; }
    const d = await fetch(`/api/venues?id=${id}`).then((r) => r.json()).catch(() => null);
    if (d?.venue) { setDetail(d.venue); setOpenId(id); }
  }

  async function addRate() {
    if (openId === null || !rlabel.trim() || !ramt) return;
    const res = await fetch("/api/venues", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "rate", venueId: openId, label: rlabel.trim(), amount: Math.round(Number(ramt) * 100), unit: runit }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Rate added ✓" : (d.error ?? "failed"));
    if (res.ok) { setRlabel(""); setRamt(""); void open(openId); void load(); }
  }

  async function bookSeries() {
    if (openId === null || !sdate || !suntil) { setMsg("Pick a start date and an until date."); return; }
    const res = await fetch("/api/bookings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        op: "series", resourceKind: "venue", resourceId: openId,
        startAt: `${sdate}T${stime}:00`, endAt: `${sdate}T${etime}:00`,
        rule: { repeat: "weekly", weekdays: sdays, until: suntil },
      }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok
      ? `Series: ${d.booked.length} booked${d.refused.length ? `, ${d.refused.length} refused (${d.refused.slice(0, 3).map((r: { startAt: string }) => r.startAt.slice(0, 10)).join(", ")})` : " — clean run ✓"}`
      : (d.error ?? "failed"));
    if (res.ok) void open(openId);
  }

  async function dropRate(id: number) {
    const res = await fetch("/api/venues", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "dropRate", id }),
    });
    if (res.ok && openId !== null) void open(openId);
  }

  if (!loaded) return <Skeleton lines={5} />;
  return (
    <div className="grid gap-3">
      <AdminCard>
        <p className="font-bold">New venue <span className="text-xs font-normal text-zinc-500">(hotel · hall · resort · apartment · room)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Grand Banquet Hall" maxLength={120}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Venue kind"
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm capitalize dark:border-white/20">
            {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Capacity" inputMode="numeric"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={amenities} onChange={(e) => setAmenities(e.target.value)} placeholder="AC, parking, stage" maxLength={400}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void save()} disabled={!name.trim()}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Save venue</button>
        </div>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Venues ({venues.length})</p>
        {venues.length === 0 ? <div className="mt-2"><Empty>No venues yet.</Empty></div> : (
          <ul className="mt-2 space-y-1 text-sm">
            {venues.map((v) => (
              <li key={v.id}>
                <button onClick={() => void open(v.id)} aria-expanded={openId === v.id}
                  className="flex min-h-[44px] w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 text-left dark:border-white/10">
                  <span><b className="capitalize">{v.kind}</b> · {v.name}{v.capacity ? ` · ${v.capacity} guests` : ""}</span>
                  <span className="text-xs text-zinc-500">{v.status}{v.amenities ? ` · ${v.amenities.slice(0, 40)}` : ""}</span>
                </button>
                {openId === v.id && detail && (
                  <div className="mt-1 rounded-xl border border-black/10 p-2 dark:border-white/10">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Rates</p>
                    {(detail.rates ?? []).length === 0
                      ? <p className="mt-1 text-xs text-zinc-500">No rates — add the first below.</p>
                      : (
                        <ul className="mt-1 space-y-1">
                          {(detail.rates ?? []).map((r) => (
                            <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                              <span>{r.label} · ₹{(r.amount / 100).toFixed(0)}/{r.unit}</span>
                              <button onClick={() => void dropRate(r.id)} aria-label={`Remove rate ${r.label}`}
                                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/15 dark:border-white/20">✕</button>
                            </li>
                          ))}
                        </ul>
                      )}
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <input value={rlabel} onChange={(e) => setRlabel(e.target.value)} placeholder="Label (Full day)" maxLength={80}
                        className="min-h-[44px] min-w-[120px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
                      <input value={ramt} onChange={(e) => setRamt(e.target.value)} placeholder="₹" inputMode="decimal"
                        className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
                      <select value={runit} onChange={(e) => setRunit(e.target.value)} aria-label="Rate unit"
                        className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
                        {(["hour", "night", "event", "day", "month"] as const).map((u) => <option key={u} value={u}>/{u}</option>)}
                      </select>
                      <button onClick={() => void addRate()} disabled={!rlabel.trim() || !ramt}
                        className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Add rate</button>
                    </div>
                    <p className="mb-1 mt-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Repeat booking (weekly series)</p>
                    <div className="flex flex-wrap gap-1.5">
                      <input value={sdate} onChange={(e) => setSdate(e.target.value)} type="date" aria-label="First date"
                        className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
                      <input value={stime} onChange={(e) => setStime(e.target.value)} type="time" aria-label="Start time"
                        className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
                      <input value={etime} onChange={(e) => setEtime(e.target.value)} type="time" aria-label="End time"
                        className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
                      <input value={suntil} onChange={(e) => setSuntil(e.target.value)} type="date" aria-label="Repeat until"
                        className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
                      <button onClick={() => void bookSeries()} disabled={!sdate || !suntil}
                        className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Book series</button>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const).map((lbl, d) => (
                        <button key={lbl} onClick={() => setSdays((xs) => xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d])}
                          aria-pressed={sdays.includes(d)} aria-label={`Repeat ${lbl}`}
                          className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border text-sm font-bold ${sdays.includes(d) ? "border-brand bg-brand/10 text-brand-deep" : "border-black/15 dark:border-white/20"}`}>{lbl}</button>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      {msg && <p className="text-sm text-zinc-500">{msg}</p>}
    </div>
  );
}
