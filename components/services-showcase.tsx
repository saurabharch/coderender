"use client";

import { useState } from "react";
import Link from "next/link";
import { SERVICES } from "@/lib/services";

export function ServicesShowcase() {
  const [active, setActive] = useState(0);
  const s = SERVICES[active];
  return (
    <div className="grid gap-6 md:grid-cols-[240px_1fr]">
      <div className="flex gap-2 overflow-x-auto md:sticky md:top-32 md:flex-col md:self-start" role="tablist" aria-label="Services">
        {SERVICES.map((x, i) => (
          <button
            key={x.slug}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`min-h-[44px] shrink-0 rounded-xl px-4 text-left text-sm font-semibold transition ${i === active ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "border border-black/10 dark:border-white/15"}`}
          >
            {x.n} · {x.title}
          </button>
        ))}
      </div>
      <article key={s.slug} className="rounded-2xl border border-black/10 p-6 dark:border-white/10 md:p-8">
        <p className="text-xs font-extrabold tracking-[0.2em] text-brand-deep">{s.n} / 06</p>
        <h3 className="display-2 mt-2">{s.title}</h3>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{s.tagline}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {s.includes.map((p) => <li key={p}>{p}</li>)}
        </ul>
        <p className="mt-3 text-sm"><span className="font-semibold">Timeline:</span> {s.timeline} · <span className="font-semibold">Guide:</span> {s.priceHint}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={`/services/${s.slug}`} className="inline-flex min-h-[44px] items-center rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">Explore →</Link>
          <Link href="/contact" className="inline-flex min-h-[44px] items-center rounded-full border border-black/15 px-5 text-sm font-semibold dark:border-white/20">Get Started Now</Link>
        </div>
      </article>
    </div>
  );
}
