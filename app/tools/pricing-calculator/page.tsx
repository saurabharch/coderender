"use client";

import { useState } from "react";
import Link from "next/link";

const BASE = [
  { id: "audit", label: "GBP Audit + rank report", price: 2999, note: "one-time, credited to a pack" },
  { id: "pack", label: "Growth Pack (profile + posts + reviews + flows + page)", price: 14999, note: "from, fixed scope" },
  { id: "site", label: "Website (fast, call-first)", price: 29999, note: "from, 3–4 weeks" },
  { id: "retainer", label: "Monthly retainer (posts + ads + reviews)", price: 11999, note: "from / month, capped" },
  { id: "leads", label: "Lead-gen management", price: 19999, note: "from / month + ad spend" },
];

export default function PricingCalculatorPage() {
  const [picked, setPicked] = useState<string[]>(["audit", "pack"]);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const once = BASE.filter((b) => picked.includes(b.id) && (b.id === "audit" || b.id === "pack" || b.id === "site"))
    .reduce((s, b) => s + b.price, 0);
  const monthly = BASE.filter((b) => picked.includes(b.id) && (b.id === "retainer" || b.id === "leads"))
    .reduce((s, b) => s + b.price, 0);
  const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");

  return (
    <div className="wrap section max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Free tool</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">Pricing Calculator</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">Tick what you need — get an instant DRAFT estimate. Final quote always in writing.</p>
      <div className="mt-6 grid gap-3">
        {BASE.map((b) => (
          <label key={b.id} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <input type="checkbox" checked={picked.includes(b.id)} onChange={() => toggle(b.id)} className="h-5 w-5 accent-teal-700" />
            <span className="flex-1"><span className="font-semibold">{b.label}</span><br /><span className="text-xs text-zinc-500">{b.note}</span></span>
            <span className="font-extrabold">{fmt(b.price)}</span>
          </label>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border-2 border-brand p-5">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Your DRAFT estimate</p>
        <p className="text-3xl font-extrabold">{once > 0 ? `${fmt(once)} one-time` : "—"}{monthly > 0 ? ` + ${fmt(monthly)}/mo` : ""}</p>
        <Link href="/contact" className="mt-3 beam beam-rainbow btn-dark inline-flex min-h-[44px] items-center rounded-full px-6 text-sm font-semibold">Lock this in writing →</Link>
      </div>
    </div>
  );
}
