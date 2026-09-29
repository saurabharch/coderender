import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SERVICES } from "@/lib/services";
import { SERVICE_ICONS } from "@/lib/nav-icons";
import { LeadForm } from "@/components/lead-form";
import { Reveal } from "@/components/reveal";

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = SERVICES.find((x) => x.slug === slug);
  return { title: s ? `${s.title} — CodeRender` : "Service — CodeRender", description: s?.tagline };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = SERVICES.find((x) => x.slug === slug);
  if (!s) notFound();
  const related = SERVICES.filter((x) => x.slug !== s.slug).slice(0, 2);
  const HeadIcon = SERVICE_ICONS[s.slug];
  return (
    <>
      <section className="hero-glow">
        <div className="wrap pb-8 pt-12 md:pt-16">
          <Reveal>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">{HeadIcon && <HeadIcon size={16} />}Service {s.n} / 06</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-[1.02] tracking-tight md:text-5xl">{s.title}</h1>
            <p className="mt-3 max-w-xl text-zinc-600 dark:text-zinc-400">{s.tagline}</p>
          </Reveal>
        </div>
      </section>
      <section>
        <div className="wrap section grid gap-4 !py-12 md:grid-cols-3">
          <div className="rounded-2xl border border-black/10 p-6 dark:border-white/10 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">What is included</p>
            <ul className="mt-3 space-y-2 text-sm">
              {s.includes.map((i) => <li key={i} className="flex gap-2"><span aria-hidden>✓</span>{i}</li>)}
            </ul>
            <p className="mt-4 text-sm"><span className="font-semibold">Timeline:</span> {s.timeline}</p>
            <p className="text-sm"><span className="font-semibold">Guide price:</span> {s.priceHint}</p>
          </div>
          <div className="rounded-2xl border border-black/10 p-6 dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Not included</p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              {s.excludes.map((e) => <li key={e} className="flex gap-2"><span aria-hidden>×</span>{e}</li>)}
            </ul>
            <p className="mt-3 text-xs text-zinc-500">Everything else lives in the written scope + change-request rule.</p>
          </div>
        </div>
      </section>
      <section className="border-t border-black/10 dark:border-white/10">
        <div className="wrap section grid gap-6 !py-12 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-extrabold">Related services</h2>
            <div className="mt-3 grid gap-3">
              {related.map((r) => {
                const RI = SERVICE_ICONS[r.slug];
                return (
                  <Link key={r.slug} href={`/services/${r.slug}`} className="rounded-2xl border border-black/10 p-4 hover:border-brand dark:border-white/10">
                    <p className="flex items-center gap-2 font-bold">{RI && <RI size={16} className="shrink-0 text-brand-deep" />}{r.title}</p>
                    <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{r.tagline}</p>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
            <h2 className="font-bold">Start with this service</h2>
            <div className="mt-3"><LeadForm source={`service:${s.slug}`} /></div>
          </div>
        </div>
      </section>
    </>
  );
}
