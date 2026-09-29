import type { Metadata } from "next";
import Link from "next/link";
import { LeadForm } from "@/components/lead-form";

export const metadata: Metadata = {
  title: "Become a Partner — CodeRender",
  description: "Refer local businesses to CodeRender and earn. Free to join, tiered commissions, dedicated support.",
};

const TIERS = [
  ["Referrer", "Send us introductions", "Commission per closed deal (DRAFT: terms on approval)"],
  ["Reseller", "Sell growth packs in your city", "Higher margin + co-branded one-pagers (DRAFT)"],
  ["City partner", "Own CodeRender for your district", "Top tier, exclusivity conversation (DRAFT)"],
];

export default function PartnerPage() {
  return (
    <div className="wrap section max-w-6xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Partner</p>
      <h1 className="mt-2 max-w-2xl text-4xl font-extrabold tracking-tight md:text-5xl">Earn with every business you send us.</h1>
      <p className="mt-3 max-w-xl text-zinc-600 dark:text-zinc-400">Free to join. Three tiers, rising commissions, training plus marketing resources — and a human who answers.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {TIERS.map(([t, d, c]) => (
          <div key={t} className="rounded-2xl border border-black/10 p-6 dark:border-white/10">
            <p className="font-bold">{t}</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{d}</p>
            <p className="mt-2 text-sm font-semibold">{c}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-bold">Apply in 30 seconds</h2>
          <div className="mt-3"><LeadForm source="partner" /></div>
        </div>
        <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-bold">How it works</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
            <li>Apply — tell us your city and network.</li>
            <li>Get approved with your tier and terms in writing.</li>
            <li>Refer; track closes; get paid monthly.</li>
          </ol>
          <Link href="/pricing" className="mt-4 inline-flex min-h-[44px] items-center font-semibold underline">See what you will be selling →</Link>
        </div>
      </div>
    </div>
  );
}
