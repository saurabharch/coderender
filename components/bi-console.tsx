"use client";

import { useEffect, useState } from "react";
import { SimpleGrid } from "@mantine/core";
import { AreaChart, BarChart, DonutChart } from "@mantine/charts";
import { AdminCard, Skeleton } from "@/components/admin-ui";
import { NoSsr } from "@/components/no-ssr";
import { StatusBadge, useInViewport } from "@/components/admin-ux";

interface Snap {
  revenue30: number; orders30: number; growth: number; margin: number;
  top: { name: string; q: number; s: number }[]; slow: { name: string; q: number }[];
  customers: number; repeatBuyers: number;
  daily: { date: string; revenue: number }[];
  funnel: { status: string; n: number; s: number }[];
  expiry: { m: string; n: number; q: number }[];
  expiredCount: number;
}

const DONUT_COLORS: Record<string, string> = {
  draft: "gray", confirmed: "blue", fulfilled: "teal", returned: "orange", cancelled: "red",
};

const STAGES = ["draft", "confirmed", "fulfilled"];

export function BiConsole() {
  const [s, setS] = useState<Snap | null>(null);
  const viz = useInViewport<HTMLDivElement>();

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
  const compare = s.top.map((t) => ({ name: t.name.slice(0, 12), revenue: Math.round(t.s / 100), qty: t.q }));
  const donut = s.funnel.map((f) => ({ name: f.status, value: f.n, color: DONUT_COLORS[f.status] ?? "gray" }));
  const funnelMax = Math.max(1, ...s.funnel.map((f) => f.n));
  const expiryBars = s.expiry.map((e) => ({ month: e.m.slice(2), lots: e.n }));

  return (
    <div className="grid gap-3">
      <NoSsr fallback={
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {stats.map(([l, v]) => (
            <div key={l} className="glass rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{l}</p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight">{v}</p>
            </div>
          ))}
        </div>
      }>
        <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
          {stats.map(([l, v]) => (
            <div key={l} className="glass rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{l}</p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight">{v}</p>
            </div>
          ))}
        </SimpleGrid>
      </NoSsr>

      <AdminCard>
        <p className="font-bold">Revenue — last 30 days (₹)</p>
        <NoSsr fallback={<p className="mt-2 text-sm text-zinc-500">Loading chart…</p>}>
          {s.daily.length > 0 ? (
            <AreaChart
              h={220} data={s.daily} dataKey="date" mt="md"
              series={[{ name: "revenue", color: "brand.6" }]}
              curveType="monotone" withGradient yAxisProps={{ width: 44 }}
            />
          ) : (
            <p className="mt-2 text-sm text-zinc-500">No sales yet — the curve appears with the first order.</p>
          )}
        </NoSsr>
      </AdminCard>

      <div ref={viz.ref}>
        {viz.seen ? (
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <AdminCard>
                <p className="font-bold">Cross-product compare <span className="text-xs font-normal text-zinc-500">(revenue ₹, top 5)</span></p>
                <NoSsr fallback={<p className="mt-2 text-sm text-zinc-500">Loading chart…</p>}>
                  {compare.length > 0 ? (
                    <BarChart h={220} data={compare} dataKey="name" mt="md"
                      series={[{ name: "revenue", color: "teal.6" }]} yAxisProps={{ width: 44 }} />
                  ) : (
                    <p className="mt-2 text-sm text-zinc-500">No sales yet — bars appear with the first order.</p>
                  )}
                </NoSsr>
              </AdminCard>
              <AdminCard>
                <p className="font-bold">Orders by status <span className="text-xs font-normal text-zinc-500">(30 days)</span></p>
                <NoSsr fallback={<p className="mt-2 text-sm text-zinc-500">Loading chart…</p>}>
                  {donut.length > 0 ? (
                    <DonutChart data={donut} size={150} thickness={28} withLabelsLine withLabels mt="md" />
                  ) : (
                    <p className="mt-2 text-sm text-zinc-500">No orders in the last 30 days.</p>
                  )}
                </NoSsr>
              </AdminCard>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <AdminCard>
                <p className="font-bold">Order funnel <span className="text-xs font-normal text-zinc-500">(draft → confirmed → fulfilled)</span></p>
                {s.funnel.length > 0 ? (
                  <ul className="mt-2 grid gap-2">
                    {STAGES.map((st) => {
                      const f = s.funnel.find((x) => x.status === st);
                      const n = f?.n ?? 0;
                      return (
                        <li key={st} className="grid gap-1">
                          <p className="flex flex-wrap items-center gap-1.5 text-sm">
                            <StatusBadge status={st} />
                            <b>{n}</b>
                            <span className="text-xs text-zinc-500">₹{(((f?.s ?? 0)) / 100).toFixed(0)}</span>
                          </p>
                          <div className="h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10" role="progressbar"
                            aria-valuenow={n} aria-valuemin={0} aria-valuemax={funnelMax} aria-label={`${st} orders`}>
                            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round((n / funnelMax) * 100)}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500">No orders in the last 30 days.</p>
                )}
              </AdminCard>
              <AdminCard>
                <p className="font-bold">Expiry watch <span className="text-xs font-normal text-zinc-500">(lots by exp month)</span></p>
                {s.expiredCount > 0 && (
                  <p className="mt-1 text-sm font-semibold text-red-600">⚠ {s.expiredCount} expired lot{s.expiredCount === 1 ? "" : "s"} still in stock — clear or write off.</p>
                )}
                <NoSsr fallback={<p className="mt-2 text-sm text-zinc-500">Loading chart…</p>}>
                  {expiryBars.length > 0 ? (
                    <BarChart h={200} data={expiryBars} dataKey="month" mt="md"
                      series={[{ name: "lots", color: "orange.6" }]} yAxisProps={{ width: 32 }} />
                  ) : (
                    <p className="mt-2 text-sm text-zinc-500">No dated lots — add mfg/expiry on batches to watch this.</p>
                  )}
                </NoSsr>
              </AdminCard>
            </div>
          </div>
        ) : (
          <Skeleton lines={4} />
        )}
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
