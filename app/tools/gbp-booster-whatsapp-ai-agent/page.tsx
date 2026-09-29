import type { Metadata } from "next";
import { CONTACT } from "@/lib/site";
import { LeadForm } from "@/components/lead-form";
import { Reveal } from "@/components/reveal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "GBP Booster — WhatsApp AI Agent — CodeRender",
  description: "Get more calls from your Google Business Profile with a WhatsApp AI agent.",
};

const AGENTS = [
  { tag: "Lead agent", title: "More calls from Google", desc: "Finds the best keywords, rewrites SEO content and services, auto-publishes posts, replies to every review with SEO-rich answers, and turns paying customers into reviewers." },
  { tag: "Chat agent", title: "Your 24/7 assistant", desc: "Trained on your offerings, prices, and testimonials. Remembers purchase history and answers in your tone — in seconds." },
  { tag: "Marketing agent", title: "Repeat sales on autopilot", desc: "Creates offers and visuals, picks the right customers from purchase data, answers promo queries, and broadcasts on WhatsApp." },
  { tag: "Shared brain", title: "One brain for all three", desc: "Captures leads, customers, and sales; segments high-potential pools; tracks performance inside one dashboard." },
];

const FAQS = [
  { q: "Will it work if I'm not tech-savvy?", a: "Yes. If you can use WhatsApp, you can use this — setup and training are on us." },
  { q: "How soon will I see results?", a: "Most businesses see more calls and messages within 2–4 weeks of the profile tune-up going live." },
  { q: "Is my customer data secure?", a: "Yes. Least-access credentials, client-owned accounts by default, nothing sensitive in files." },
];

export default function GbpPage() {
  return (
    <>
      <section className="hero-glow">
        <div className="wrap pb-8 pt-12 text-center md:pt-16">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Featured tool</p>
            <h1 className="display-1 mx-auto mt-3 max-w-3xl text-balance">GBP Booster — WhatsApp AI Agent</h1>
            <p className="mx-auto mt-3 max-w-xl text-zinc-600 dark:text-zinc-400">More calls from Google: keywords, SEO posts, review replies, review generation, and instant WhatsApp answers.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a href={CONTACT.whatsapp} className="inline-flex min-h-[44px] items-center rounded-full bg-zinc-900 px-6 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">Try on WhatsApp →</a>
              <a href="/contact" className="inline-flex min-h-[44px] items-center rounded-full border border-black/15 px-6 text-sm font-semibold dark:border-white/20">Book Free Demo</a>
            </div>
          </Reveal>
        </div>
      </section>

      <section>
        <div className="wrap section !py-12">
          <Reveal>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {AGENTS.map((a, i) => (
                <div key={a.tag} className={i === 0
                  ? "beam glass rounded-2xl p-8 md:col-span-2 md:row-span-2"
                  : "glass rounded-2xl p-6"}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">{a.tag}</p>
                  <p className={`mt-3 font-extrabold tracking-tight ${i === 0 ? "text-3xl md:text-4xl" : "text-xl"}`}>{a.title}</p>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{a.desc}</p>
                </div>
              ))}
              <div className="rounded-2xl border border-black/10 p-6 dark:border-white/10 md:col-span-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Start</p>
                <p className="mt-3 text-xl font-extrabold tracking-tight">Free rank report first.</p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">See what is leaking calls before you pay anything.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
        <div className="wrap section grid gap-8 !py-12 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">FAQ</p>
            <Accordion type="single" collapsible className="mt-4">
              {FAQS.map((f) => (
                <AccordionItem key={f.q} value={f.q}>
                  <AccordionTrigger>{f.q}</AccordionTrigger>
                  <AccordionContent>{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
            <h2 className="font-bold">Get your free rank report</h2>
            <div className="mt-3"><LeadForm source="gbp-booster" /></div>
          </div>
        </div>
      </section>
    </>
  );
}
