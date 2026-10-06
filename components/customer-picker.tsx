"use client";

import { useRef, useState } from "react";
import { modals } from "@mantine/modals";

export interface Cust { id: number; name: string; phone: string }

// Phone-first customer picker: type 5+ digits → matching customers suggest;
// pick attaches to the bill. New Customer opens a dialog (WhatsApp defaults
// to the contact number unless unchecked + a different number is entered).
export function CustomerPicker({ customer, onPick }: {
  customer: Cust | null; onPick: (c: Cust | null) => void;
}) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<Cust[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function search(v: string) {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    const digits = v.replace(/\D/g, "");
    if (digits.length < 5) { setOpts([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const d = await fetch(`/api/shop/customers?q=${encodeURIComponent(v.trim())}`).then((r) => r.json()).catch(() => null);
      const list = (d?.customers ?? []).slice(0, 6);
      setOpts(list);
      setOpen(list.length > 0);
    }, 300);
  }

  function newCustomer() {
    modals.open({
      title: "New customer",
      children: <NewCustomerForm
        phone={q.replace(/\D/g, "")}
        onDone={(c) => { modals.closeAll(); onPick(c); setQ(c.name); setOpen(false); }}
      />,
    });
  }

  return (
    <div className="relative">
      <div className="flex gap-1.5">
        <input value={customer ? `${customer.name} · ${customer.phone}` : q}
          onChange={(e) => { onPick(null); search(e.target.value); }}
          placeholder="Customer phone — 5+ digits to search" inputMode="tel" maxLength={60}
          className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        {customer ? (
          <button onClick={() => { onPick(null); setQ(""); }} aria-label="Clear customer"
            className="min-h-[44px] min-w-[44px] rounded-xl border border-black/15 dark:border-white/20">✕</button>
        ) : (
          <button onClick={newCustomer} disabled={q.replace(/\D/g, "").length < 5}
            className="min-h-[44px] shrink-0 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">+ New</button>
        )}
      </div>
      {open && !customer && (
        <ul className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-black/15 bg-white shadow-xl dark:border-white/20 dark:bg-zinc-900">
          {opts.map((c) => (
            <li key={c.id}>
              <button onClick={() => { onPick(c); setQ(c.name); setOpen(false); }}
                className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10">
                <span className="min-w-0 truncate">#{c.id} {c.name}</span>
                <span className="shrink-0 font-mono text-xs text-zinc-500">{c.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewCustomerForm({ phone, onDone }: { phone: string; onDone: (c: Cust) => void }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState(phone);
  const [sameWa, setSameWa] = useState(true);
  const [wa, setWa] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [locality, setLocality] = useState("");
  const [msg, setMsg] = useState("");

  async function save() {
    const digits = contact.replace(/\D/g, "");
    if (!name.trim() || digits.length < 10) { setMsg("Name + 10-digit contact required."); return; }
    const res = await fetch("/api/shop/customers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, phone: digits.slice(-10),
        email, notes: [address, locality].filter(Boolean).join(", "),
        tags: sameWa ? "wa-same" : `wa:${wa.replace(/\D/g, "").slice(-10)}`,
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) onDone({ id: d.id, name, phone: digits.slice(-10) });
    else setMsg(d.error ?? "save failed");
  }

  return (
    <div className="grid gap-2">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={120}
        className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
      <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Contact number" inputMode="tel" maxLength={20}
        className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
      <label className="flex min-h-[44px] items-center gap-2 text-sm">
        <input type="checkbox" checked={sameWa} onChange={(e) => setSameWa(e.target.checked)} className="h-5 w-5" />
        WhatsApp same as contact
      </label>
      {!sameWa && (
        <input value={wa} onChange={(e) => setWa(e.target.value)} placeholder="WhatsApp number" inputMode="tel" maxLength={20}
          className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
      )}
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" inputMode="email" maxLength={120}
        className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
      <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" maxLength={300}
        className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
      <input value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="Locality" maxLength={120}
        className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
      <button onClick={() => void save()} disabled={!name.trim()}
        className="min-h-[44px] rounded-xl bg-brand text-sm font-bold text-white disabled:opacity-40">Save & attach</button>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  );
}
