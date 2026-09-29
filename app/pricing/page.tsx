import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — CodeRender",
  description: "Fixed-price audit, project growth packs, and capped monthly retainers. All prices DRAFT until verified.",
};

export default function PricingPage() {
  return (
    <div className="wrap section">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Company</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">Pricing</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">All prices DRAFT until verified. Every offer carries exclusions + a change-request rule.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Entry</p>
          <p className="mt-3 font-bold">Diagnostic</p>
          <p className="mt-1 text-2xl font-extrabold">DRAFT ₹2,999</p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">GBP audit + rank report + next-3-moves. Credited toward a pack.</p>
        </div>
        <div className="beam glass rounded-2xl p-6 md:-my-3 md:py-9">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Most popular · Project</p>
          <p className="mt-3 font-bold">Growth Pack</p>
          <p className="mt-1 text-3xl font-extrabold">DRAFT from ₹14,999</p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Fixed-scope project: profile tune + posts + reviews + WhatsApp flows + landing page.</p>
          <a href="/contact" className="beam beam-rainbow btn-dark mt-4 inline-flex min-h-[44px] items-center rounded-full px-5 text-sm font-semibold">Start with an audit →</a>
        </div>
        <div className="glass rounded-2xl p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Retainer</p>
          <p className="mt-3 font-bold">Monthly growth</p>
          <p className="mt-1 text-2xl font-extrabold">DRAFT from ₹11,999/mo</p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Capped monthly posts, reels support, ads, and review handling.</p>
        </div>
      </div>
    </div>
  );
}
