"use client";

import { useEffect, useState } from "react";
import { AdminCard, Skeleton } from "@/components/admin-ui";

interface Snap {
  revenue30: number; orders30: number; growth: number; margin: number;
  top: { name: string; q: number; s: number }[]; slow: { name: string; q: number }[];
  customers: number; repeatBuyers: number;
}

export function BiConsole() {
  const [s, setS] = useState<Snap | null>(null);

  useEffect(() => {
    fetch("/api/bi").then((r) => r.json()).then((d) => { if (!d.error) setS(d); }).catch(() => {});
  }, []);

  if (!s) return <Skeleton lines={5} />;
  const stats: [string, string][] = [
    ["Revenue 30d", `₹${(s.revenue30 / 100).toFixed(0)}`],
    ["Orders 30d", String(s.orders30)],
    ["Growth vs prior", `${s.growth >= 0 ? "+" : ""}${s.growth}%`],
    ["Margin", `${s.margin}%`],
    ["Customers", String(s.customers)],
    ["Repeat buyers", String(s.repeatBuyers)],
  ];
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map(([l, v]) => (
          <div key={l} className="glass rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{l}</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight">{v}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <AdminCard>
          <p className="font-bold">Best products</p>
          <ul className="mt-2 space-y-1 text-sm">
            {s.top.map((t, i) => <li key={i} className="flex justify-between gap-2"><span className="truncate">{t.name}</span><b>₹{(t.s / 100).toFixed(0)}</b></li>)}
            {s.top.length === 0 && <li className="text-zinc-500">No sales yet.</li>}
          </ul>
        </AdminCard>
        <AdminCard>
          <p className="font-bold">Slow stock (never sold)</p>
          <ul className="mt-2 space-y-1 text-sm">
            {s.slow.map((t, i) => <li key={i} className="flex justify-between gap-2"><span className="truncate">{t.name}</span><b>{t.q}</b></li>)}
            {s.slow.length === 0 && <li className="text-zinc-500">Everything moves.</li>}
          </ul>
        </AdminCard>
      </div>
    </div>
  );
}
