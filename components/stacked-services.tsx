"use client";

import Link from "next/link";
import { SERVICES } from "@/lib/services";
import { SERVICE_ICONS, palette } from "@/lib/nav-icons";

// Scroll-stacking cards: each sticks below the previous with a stepped offset.
export function StackedServices() {
  return (
    <div className="mt-6">
      {SERVICES.map((s, i) => {
        const SI = SERVICE_ICONS[s.slug];
        return (
          <div key={s.slug} className="sticky" style={{ top: `${88 + i * 20}px` }}>
            <article className="mb-4 rounded-3xl border border-black/10 bg-[#fbf8f3] p-6 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-zinc-950 md:p-8">
              <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white dark:bg-white/10 ${palette(i)}`}>
                  {SI && <SI size={22} />}
                </span>
                <div>
                  <p className="text-xs font-extrabold tracking-[0.2em] text-brand-deep">{s.n} / 06</p>
                  <h3 className="text-xl font-extrabold tracking-tight md:text-2xl">{s.title}</h3>
                </div>
              </div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{s.tagline}</p>
              <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                {s.includes.map((p) => <li key={p} className="flex gap-2"><span aria-hidden>✓</span>{p}</li>)}
              </ul>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Link href={`/services/${s.slug}`} className="inline-flex min-h-[44px] items-center rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">Explore →</Link>
                <span className="text-xs text-zinc-500">{s.timeline} · {s.priceHint}</span>
              </div>
            </article>
          </div>
        );
      })}
    </div>
  );
}
