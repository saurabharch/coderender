import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About us — CodeRender",
  description: "CodeRender runs local growth for small businesses: profile, posts, reviews, replies, ads, and fast websites.",
};

export default function AboutPage() {
  return (
    <div className="wrap section max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Company</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">Marketing that delivers revenue.</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        CodeRender is a growth agency for local businesses — salons, clinics, gyms, restaurants, and the shops
        that keep a neighbourhood running. We run the work owners never have time for: the Google profile tuned
        to rank on Maps, posts published on schedule, every review answered, every WhatsApp message replied in
        seconds, and ads built from the content that already works.
      </p>
      <h2 className="mt-8 text-xl font-extrabold">How we work</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
        <li>Fixed scope, fixed price, fixed date — entry audit, project pack, capped retainer.</li>
        <li>Every offer carries exclusions and a change-request rule, in writing.</li>
        <li>We promise deliverables and time saved, never rankings or revenue.</li>
        <li>Weekly proof: posts live, reviews answered, calls and messages counted.</li>
      </ul>
      <h2 className="mt-8 text-xl font-extrabold">What we optimize for</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        {[
          ["Trust first", "Least-access credentials, client-owned accounts, no surprises in billing."],
          ["Your success is the metric", "We count calls, bookings, and renewals — not impressions."],
          ["Boring reliability", "Same rhythm every week: posts, replies, broadcasts, report."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <p className="font-bold">{t}</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{d}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/pricing" className="beam beam-rainbow btn-dark inline-flex min-h-[44px] items-center rounded-full px-6 text-sm font-semibold">See pricing →</Link>
        <Link href="/contact" className="inline-flex min-h-[44px] items-center rounded-full border border-black/15 px-6 text-sm font-semibold dark:border-white/20">Talk to us</Link>
      </div>
    </div>
  );
}
