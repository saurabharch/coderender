import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CONTACT, VERTICALS } from "@/lib/site";
import { SERVICES } from "@/lib/services";
import { SERVICE_ICONS } from "@/lib/nav-icons";
import { VERTICAL_ICONS } from "@/lib/nav-icons";
import { PhoneMock } from "@/components/phone-mock";
import { LeadForm } from "@/components/lead-form";
import { Reveal } from "@/components/reveal";

export function generateStaticParams() {
  return VERTICALS.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const v = VERTICALS.find((x) => x.slug === slug);
  return {
    title: v ? `${v.label} — CodeRender` : "Industry — CodeRender",
    description: v?.blurb ?? "Local growth for your business type.",
  };
}

export default async function IndustryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = VERTICALS.find((x) => x.slug === slug);
  if (!v) notFound();
  const related = VERTICALS.filter((x) => x.slug !== v.slug).slice(0, 3);
  return (
    <>
      <section className="hero-glow">
        <div className="wrap pb-8 pt-12 text-center md:pt-16">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Coderender for</p>
            <h1 className="display-1 mx-auto mt-3 max-w-3xl text-balance">{v.label}</h1>
            <p className="mx-auto mt-3 max-w-xl text-zinc-600 dark:text-zinc-400">{v.blurb}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a href={CONTACT.whatsapp} className="inline-flex min-h-[44px] items-center rounded-full bg-zinc-900 px-6 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">Free GBP Booster →</a>
              <a href="/contact" className="inline-flex min-h-[44px] items-center rounded-full border border-black/15 px-6 text-sm font-semibold dark:border-white/20">Book Free Demo</a>
            </div>
            <div className="mt-8 flex justify-center"><PhoneMock /></div>
          </Reveal>
        </div>
      </section>

      <section>
        <div className="wrap section grid gap-4 !py-12 md:grid-cols-2">
          <div className="rounded-2xl border border-black/10 p-6 dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Sound familiar?</p>
            <ul className="mt-3 space-y-2 text-sm">
              {v.pains.map((p) => <li key={p} className="flex gap-2"><span aria-hidden>·</span>{p}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-black/10 bg-brand-soft/40 p-6 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">What changes</p>
            <ul className="mt-3 space-y-2 text-sm">
              {v.wins.map((w) => <li key={w} className="flex gap-2"><span aria-hidden>✓</span>{w}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
        <div className="wrap section !py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">It answers like you do</p>
          <div className="mx-auto mt-4 max-w-md rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-zinc-900">{v.chatQ}</p>
            <p className="mt-2 w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-zinc-100 px-4 py-2 text-sm dark:bg-zinc-800">{v.chatA}</p>
            <p className="mt-2 text-right text-xs text-zinc-500">Answered in seconds, 24/7 — in your tone, with your prices.</p>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap section !py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Your monthly stack</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight">What a month includes for {v.label}</h2>
          <div className="marquee mt-5 pb-2">
            <div className="marquee-auto">
            {[SERVICES[0], SERVICES[5], SERVICES[2], SERVICES[0], SERVICES[5], SERVICES[2]].map((s, i) => {
              const SI = SERVICE_ICONS[s.slug];
              return (
              <article key={`${s.slug}-${i}`} className="w-72 rounded-2xl border border-black/10 p-5 dark:border-white/10">
                <p className="flex items-center gap-2 text-xs font-bold text-brand-deep">{SI && <SI size={15} />}{s.n} / 06</p>
                <h3 className="mt-1 font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{s.tagline}</p>
                <p className="mt-2 text-xs font-semibold">{s.timeline}</p>
              </article>
              );
            })}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap section grid gap-8 !py-12 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Also built for</h2>
            <div className="mt-4 grid gap-3">
              {related.map((r) => {
                const RI = VERTICAL_ICONS[r.slug];
                return (
                  <Link key={r.slug} href={`/industries/${r.slug}`} className="rounded-2xl border border-black/10 p-4 hover:border-brand dark:border-white/10">
                    <p className="flex items-center gap-2 font-bold">{RI && <RI size={16} className="shrink-0 text-brand-deep" />}{r.label}</p>
                    <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{r.blurb}</p>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
            <h2 className="font-bold">Request a callback</h2>
            <div className="mt-3"><LeadForm source={`industry:${v.slug}`} /></div>
          </div>
        </div>
      </section>
    </>
  );
}
