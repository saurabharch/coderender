"use client";

import { useState } from "react";

interface Venue {
  id: number; name: string; kind: string; capacity: number; amenities: string; busy: boolean;
}

// Public booking: search → quote → 15-minute hold → confirm (pay at venue).
// Captcha-gated + rate-limited server-side, like public chat.
export function BookFlow() {
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [quote, setQuote] = useState<{ venueId: number; name: string; rate: { label: string; amount: number; unit: string }; qty: number; total: number } | null>(null);
  const [hold, setHold] = useState<{ id: number; expiresAt: string } | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState<number | null>(null);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    setQuote(null);
    const p = new URLSearchParams({ ...(kind ? { kind } : {}), ...(q.trim() ? { q: q.trim() } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) });
    const d = await fetch(`/api/book?${p}`).then((r) => r.json()).catch(() => null);
    if (d?.venues) setVenues(d.venues);
    else setMsg("Search failed — try again.");
  }

  async function getQuote(v: Venue) {
    const res = await fetch("/api/book", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "quote", venueId: v.id }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(d.error ?? "No rates for this venue yet."); return; }
    setQuote({ venueId: v.id, name: v.name, rate: d.rate, qty: d.qty, total: d.total });
    setMsg("");
  }

  async function holdIt() {
    if (!quote || !from || !to) { setMsg("Pick dates first, then hold."); return; }
    const res = await fetch("/api/book", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "hold", venueId: quote.venueId, startAt: from, endAt: to }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(d.error ?? "Hold failed."); return; }
    setHold({ id: d.id, expiresAt: d.expiresAt });
    setMsg(`Held for 15 minutes ✓ Confirm below before ${d.expiresAt.slice(11, 16)}.`);
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!hold || !name.trim() || phone.trim().length < 7) { setMsg("Name + valid phone required."); return; }
    const res = await fetch("/api/book", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "confirm", id: hold.id, name: name.trim(), phone: phone.trim() }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(d.error ?? "Confirmation failed."); return; }
    setDone(d.id);
    setMsg("");
  }

  if (done !== null) {
    return (
      <div className="rounded-3xl border border-black/10 p-6 text-center dark:border-white/10">
        <p className="text-2xl font-extrabold">Booked ✓</p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Booking #{done} confirmed — pay at the venue. We&apos;ll call you shortly to confirm details.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={search} className="flex flex-wrap gap-1.5">
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Venue kind"
          className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm capitalize dark:border-white/20">
          <option value="">Any kind</option>
          {(["hotel", "hall", "resort", "apartment", "room"] as const).map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, amenity…" maxLength={60}
          className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <input value={from} onChange={(e) => setFrom(e.target.value)} type="datetime-local" aria-label="From"
          className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <input value={to} onChange={(e) => setTo(e.target.value)} type="datetime-local" aria-label="To"
          className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <button className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white">Search</button>
      </form>

      {venues !== null && (
        venues.length === 0
          ? <p className="text-sm text-zinc-500">No venues match — try other dates or kinds.</p>
          : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {venues.map((v) => (
                <li key={v.id} className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
                  <p className="font-extrabold"><span className="mr-1 text-xs font-bold uppercase text-zinc-500">{v.kind}</span>{v.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{v.capacity ? `${v.capacity} guests · ` : ""}{v.amenities || "Details on request"}</p>
                  {from && to && (
                    <p className={`mt-1 text-xs font-bold ${v.busy ? "text-red-600" : "text-emerald-700"}`}>
                      {v.busy ? "Busy for these dates" : "Available ✓"}</p>
                  )}
                  <div className="mt-2 flex gap-1.5">
                    <button onClick={() => void getQuote(v)} disabled={v.busy}
                      className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold disabled:opacity-40 dark:border-white/20">Price</button>
                    {quote?.venueId === v.id && (
                      <span className="flex min-h-[44px] items-center text-sm font-bold">
                        {quote.rate.label} · ₹{(quote.total / 100).toFixed(0)}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )
      )}

      {quote && (
        <div className="rounded-2xl border border-brand/40 bg-brand/5 p-4">
          <p className="font-bold">{quote.name} · {quote.rate.label} · ₹{(quote.total / 100).toFixed(0)}</p>
          {!hold ? (
            <button onClick={() => void holdIt()} disabled={!from || !to}
              className="mt-2 min-h-[48px] rounded-xl bg-brand px-6 text-sm font-bold text-white disabled:opacity-40">
              Hold these dates (15 min){!from || !to ? " — pick dates above first" : ""}</button>
          ) : (
            <form onSubmit={confirm} className="mt-2 grid gap-2">
              <div className="flex flex-wrap gap-1.5">
                <input value={name} onChange={(e) => setName(e.target.value)} required minLength={1} maxLength={120}
                  placeholder="Your name" autoComplete="name"
                  className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} required minLength={7} maxLength={20}
                  placeholder="Phone" inputMode="tel" autoComplete="tel"
                  className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
              </div>
              <button className="min-h-[48px] rounded-xl bg-brand px-6 text-sm font-bold text-white">Confirm booking — pay at venue</button>
            </form>
          )}
        </div>
      )}
      {msg && <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">{msg}</p>}
    </div>
  );
}
