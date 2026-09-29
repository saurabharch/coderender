import type { Metadata } from "next";
import { CONTACT } from "@/lib/site";
import { LeadForm } from "@/components/lead-form";

export const metadata: Metadata = {
  title: "GBP Booster — WhatsApp AI Agent — CodeRender",
  description: "Get more calls from your Google Business Profile with a WhatsApp AI agent.",
};

export default function GbpPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-deep">Featured tool</p>
      <h1 className="mt-2 text-3xl font-extrabold md:text-5xl">GBP Booster — WhatsApp AI Agent</h1>
      <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">
        More calls from Google: keywords, SEO posts, review replies, review generation, and instant WhatsApp answers.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={CONTACT.whatsapp} className="inline-flex min-h-[44px] items-center rounded-xl bg-brand px-6 font-semibold text-white">Try on WhatsApp</a>
        <a href="/contact" className="inline-flex min-h-[44px] items-center rounded-xl border border-black/15 px-6 font-semibold dark:border-white/20">Book Free Demo</a>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <ul className="list-disc space-y-1 rounded-2xl border border-black/10 p-5 pl-8 text-sm dark:border-white/10">
          <li>SEO keywords + rewritten GBP content and services</li>
          <li>Auto-published GBP posts</li>
          <li>SEO-rich replies to every Google review</li>
          <li>Authentic review requests to paying customers</li>
          <li>24/7 chat trained on your offerings, prices, history</li>
        </ul>
        <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-bold">Get your free rank report</h2>
          <div className="mt-3"><LeadForm source="gbp-booster" /></div>
        </div>
      </div>
    </div>
  );
}
