import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Careers — CodeRender",
  description: "Work on local growth: GBP operations, WhatsApp automation, and fast websites.",
};

const ROLES = [
  { t: "Local SEO operator", d: "Profiles, posts, citations, and review replies across 10 verticals. Checklists over heroics." },
  { t: "WhatsApp automation builder", d: "Reply flows, broadcasts, and lead capture — tested before they touch a client." },
  { t: "Web builder", d: "Fast Next.js pages that turn visits into calls. Ships weekly, measures everything." },
];

export default function CareersPage() {
  return (
    <div className="wrap section max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Company</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">Do work owners can see.</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        No open roles right now — but we keep a short list of operators and builders who want to work on local
        growth. If one of these is you, send your portfolio through the contact page.
      </p>
      <div className="mt-6 grid gap-4">
        {ROLES.map((r) => (
          <div key={r.t} className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
            <p className="font-bold">{r.t}</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{r.d}</p>
          </div>
        ))}
      </div>
      <Link href="/contact" className="beam beam-rainbow btn-dark mt-6 inline-flex min-h-[44px] items-center rounded-full px-6 text-sm font-semibold">Send your portfolio →</Link>
    </div>
  );
}
