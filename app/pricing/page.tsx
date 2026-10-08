import type { Metadata } from "next";
import { sitePrices, fmt } from "@/lib/pricing";
import { listPlans } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Pricing — CodeRender",
  description: "Fixed-price audit, project growth packs, and capped monthly retainers. Final quotes always in writing.",
};

export default function PricingPage() {
  const p = sitePrices();
  const packs = listPlans().filter((x) => x.active);
  return (
    <div className="wrap section">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Company</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">Pricing</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">Fixed prices, final quotes in writing. Every offer carries exclusions + a change-request rule.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Entry</p>
          <p className="mt-3 font-bold">Diagnostic</p>
          <p className="mt-1 text-2xl font-extrabold">{fmt(p.audit)}</p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">GBP audit + rank report + next-3-moves. Credited toward a pack.</p>
        </div>
        <div className="beam glass rounded-2xl p-6 md:-my-3 md:py-9">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Most popular · Project</p>
          <p className="mt-3 font-bold">Growth Pack</p>
          <p className="mt-1 text-3xl font-extrabold">from {fmt(p.packFrom)}</p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Fixed-scope project: profile tune + posts + reviews + WhatsApp flows + landing page.</p>
          <a href="/contact" className="beam beam-rainbow btn-dark mt-4 inline-flex min-h-[44px] items-center rounded-full px-5 text-sm font-semibold">Start with an audit →</a>
        </div>
        <div className="glass rounded-2xl p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Retainer</p>
          <p className="mt-3 font-bold">Monthly growth</p>
          <p className="mt-1 text-2xl font-extrabold">from {fmt(p.retainerFrom)}/mo</p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Capped monthly posts, reels support, ads, and review handling.</p>
        </div>
      </div>
      {packs.length > 0 && (
        <div className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Configured packs</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Pick a fixed scope</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {packs.map((k) => (
              <div key={k.id} className="glass rounded-2xl p-6">
                <p className="font-bold">{k.name}</p>
                <p className="mt-1 text-2xl font-extrabold">₹{k.price}{k.per && k.per !== "one-time" ? <span className="text-sm font-semibold"> {k.per}</span> : null}</p>
                {k.bestFor ? <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Best for {k.bestFor}</p> : null}
                {k.timeline ? <p className="mt-1 text-xs text-zinc-500">{k.timeline}</p> : null}
                {(k.services ?? []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {k.services.map((s) => (
                      <span key={s.id} className="rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand-deep">{s.title}</span>
                    ))}
                  </div>
                )}
                {(k.includes ?? []).length > 0 && (
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                    {k.includes.slice(0, 6).map((inc, i) => <li key={i}>{inc}</li>)}
                  </ul>
                )}
                <a href="/contact" className="btn-glass mt-4 inline-flex min-h-[44px] items-center rounded-full px-5 text-sm font-semibold">Enquire →</a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
