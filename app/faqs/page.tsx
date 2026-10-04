import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQs — CodeRender",
  description: "Answers about CodeRender pricing, timelines, data safety, support, refunds, and how client work happens.",
  keywords: ["coderender faq", "pricing faqs", "support faqs", "how it works"],
};

const GROUPS: { h: string; items: { q: string; a: string; link?: [string, string] }[] }[] = [
  {
    h: "Services & pricing",
    items: [
      { q: "What does CodeRender do?", a: "WhatsApp automation, Google Business Profile management, local SEO, lead generation, and fast websites for local businesses — so enquiries arrive while you focus on customers." },
      { q: "What does it cost?", a: "Website prices are DRAFT estimates until a written quote. Start with a fixed-price audit (credited toward a pack), then a per-vertical growth pack or a capped monthly retainer.", link: ["/pricing", "See pricing"] },
      { q: "How fast will I see enquiries?", a: "Most businesses see more calls and messages within 2–4 weeks once the profile tune-up and reply flows go live. Retainer momentum compounds from month 2–3." },
      { q: "Do I need to be tech-savvy?", a: "No. If you can use WhatsApp, you can work with us. We handle setup and send a simple weekly summary." },
    ],
  },
  {
    h: "Working together",
    items: [
      { q: "How do projects start?", a: "Written quote → 50% advance → kickoff in week 1–2 once we receive your logins, photos, and price lists. Two revision rounds per deliverable are included." },
      { q: "Who owns my accounts and data?", a: "You do — always. We work inside your accounts or hand over full admin on exit, plus a 15-day overlap note." },
      { q: "Can I pause or cancel?", a: "Retainers pause up to 60 days a year or cancel with 15 days notice. One-time projects cancel per the Refund Policy.", link: ["/refund", "Refund Policy"] },
    ],
  },
  {
    h: "Trust & safety",
    items: [
      { q: "Is my customer data safe?", a: "Yes. Least-access credentials, client-owned accounts by default, secrets never stored in files, HTTPS throughout.", link: ["/privacy", "Privacy Policy"] },
      { q: "Do you guarantee rankings or revenue?", a: "No — and you should distrust anyone who does. We promise skilled, honest work with weekly proof, not magic outcomes." },
      { q: "What if something goes wrong?", a: "Raise a ticket for a reply in one business day; unresolved issues climb the grievance ladder with named timelines.", link: ["/grievance", "Grievance Redressal"] },
      { q: "How do refunds work?", a: "Not started = 100% back. Started = you pay only for delivered milestones. Retainers run to month-end after 15-day notice.", link: ["/refund", "Refund Policy"] },
    ],
  },
  {
    h: "Support",
    items: [
      { q: "How do I reach support?", a: "Raise a ticket, use the chat widget, WhatsApp or call Mon–Sat 10:30 AM–7 PM IST, or email us.", link: ["/support", "Support hub"] },
      { q: "I suspect fraud or misuse — what do I do?", a: "Report it immediately on the complaints page. Impersonation and payment-fraud reports jump the queue.", link: ["/complaints", "Complaint & Fraud Resolution"] },
    ],
  },
];

export default function FaqsPage() {
  return (
    <div className="wrap section max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Help</p>
      <h1 className="display-1 mt-1">Frequently asked questions</h1>
      <div className="mt-6 space-y-8">
        {GROUPS.map((g) => (
          <section key={g.h}>
            <h2 className="display-2">{g.h}</h2>
            <div className="mt-3 space-y-2">
              {g.items.map((it) => (
                <details key={it.q} className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
                  <summary className="min-h-[44px] cursor-pointer font-semibold">{it.q}</summary>
                  <p className="mt-1 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">{it.a}</p>
                  {it.link && <p className="mt-2"><Link href={it.link[0]} className="text-sm font-semibold text-brand-deep underline">{it.link[1]} →</Link></p>}
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
