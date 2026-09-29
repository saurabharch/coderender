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
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/pricing" className="inline-flex min-h-[44px] items-center rounded-full bg-zinc-900 px-6 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">See pricing →</Link>
        <Link href="/contact" className="inline-flex min-h-[44px] items-center rounded-full border border-black/15 px-6 text-sm font-semibold dark:border-white/20">Talk to us</Link>
      </div>
    </div>
  );
}
