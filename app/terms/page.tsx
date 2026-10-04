import type { Metadata } from "next";
import { CONTACT } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms & Conditions — CodeRender",
  description: "The working agreement for CodeRender services: scope, payments, timelines, ownership, and fair-use rules.",
  keywords: ["coderender terms", "service agreement", "payment terms", "project terms"],
};

const SECTIONS: { h: string; body: string[] }[] = [
  {
    h: "Who we are",
    body: [
      "CodeRender Studio (“we”, “us”) provides WhatsApp automation, Google Business Profile management, local SEO, lead generation, and website services to local businesses across India.",
      "Using this website or buying a service means you accept these terms. If a written quote or order contradicts these terms, the written quote wins for that order.",
    ],
  },
  {
    h: "Quotes and scope",
    body: [
      "Website prices are DRAFT estimates until confirmed in writing (email or order). A confirmed quote lists exactly what is included, the timeline, and what counts as a revision.",
      "Anything outside the confirmed scope — extra pages, extra ad creatives, extra locations — is quoted separately before work starts. No surprise bills, ever.",
      "You confirm business facts we publish (hours, prices, offers). We are not liable for losses caused by incorrect facts you approved.",
    ],
  },
  {
    h: "Payments",
    body: [
      "One-time projects: 50% advance to start, 50% on delivery unless the quote says otherwise.",
      "Monthly retainers: billed in advance on the same date each month; pauses on written request with 7 days notice.",
      "Ad spend is billed by Meta/Google directly or passed through at cost with receipts — it is never our revenue and never refundable by us.",
      "Late payments beyond 15 days pause work and scheduled posts until cleared; data and accounts stay safe and resume on payment.",
    ],
  },
  {
    h: "Timelines and your inputs",
    body: [
      "Timelines run from the day we receive everything listed under “we need from you” (logins, photos, price lists). Each delayed input moves delivery by the same delay.",
      "Review rounds: two revision rounds per deliverable are included; further rounds are billed at the day rate in your quote.",
      "We reply within one business day (Mon–Sat); urgent blocks (site down, ad account locked) get same-day triage on retainers.",
    ],
  },
  {
    h: "Ownership and access",
    body: [
      "You own your accounts, domains, ad accounts, and customer data — always. We work inside your accounts or hand over full admin on exit.",
      "Work product we create for you (posts, pages, flows, reports) becomes yours once paid in full. Unpaid work stays licensed to us until the balance clears.",
      "Our internal playbooks, prompts, and tooling remain ours — you get the outcomes, not the kitchen.",
    ],
  },
  {
    h: "Fair use and conduct",
    body: [
      "No spam, no scraping, no reselling our logins, and no unlawful or abusive content through our forms, chat, or broadcast tools.",
      "Abuse (spam, fraud, threats) can pause services immediately with written notice; genuine disputes follow the grievance ladder instead.",
      "Rate limits protect shared systems — automated bulk use needs a written automation plan with us first.",
    ],
  },
  {
    h: "Warranties and liability",
    body: [
      "We promise skilled, honest work — not rankings, revenue, virality, or follower counts. Anyone promising those is selling magic, not marketing.",
      "Our total liability for any order is capped at what you paid for that order. We are never liable for platform outages (Google, Meta, WhatsApp) or your lost profits beyond that cap.",
    ],
  },
  {
    h: "Ending work",
    body: [
      "Either side can end a retainer with 15 days written notice; one-time projects can be cancelled before delivery with the advance adjusted against work done (see Refund Policy).",
      "On exit we hand over credentials, files, and a 15-day overlap note so your next vendor starts clean.",
    ],
  },
  {
    h: "Disputes",
    body: [
      "Talk first: raise it via support and we fix or explain within 7 working days. Unresolved issues go up the Grievance Redressal ladder.",
      "Jurisdiction for any formal dispute is the courts at our principal place of business in India, as stated on your invoice.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="wrap section max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Legal</p>
      <h1 className="display-1 mt-1">Terms & Conditions</h1>
      <p className="mt-2 text-xs text-zinc-500">Last updated: October 2026 · CodeRender Studio, India</p>
      <div className="mt-6 space-y-6">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="display-2">{s.h}</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
              {s.body.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </section>
        ))}
        <p className="text-[15px] text-zinc-600 dark:text-zinc-400">
          Questions: <a className="underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> · <a className="underline" href="/contact">Contact page</a>
        </p>
      </div>
    </div>
  );
}
