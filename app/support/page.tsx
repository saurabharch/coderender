import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT } from "@/lib/site";

export const metadata: Metadata = {
  title: "Support — CodeRender",
  description: "Get help from CodeRender: raise a ticket, read FAQs and docs, check grievance and complaint paths, or talk to a human.",
  keywords: ["coderender support", "help", "raise ticket", "contact support"],
};

const CARDS = [
  { h: "/support/ticket", t: "Raise a ticket", d: "Bugs, billing, delivery — tracked with a reply in one business day." },
  { h: "/faqs", t: "FAQs", d: "Prices, timelines, data safety, and how work happens." },
  { h: "/docs", t: "Docs", d: "How every feature on this site works." },
  { h: "/grievance", t: "Grievance redressal", d: "Escalation ladder with named timelines." },
  { h: "/complaints", t: "Complaint & fraud", d: "Report misuse or suspected fraud safely." },
  { h: "/contact", t: "Talk to a human", d: "Call, WhatsApp, or email — Mon–Sat." },
];

export default function SupportPage() {
  return (
    <div className="wrap section max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Support</p>
      <h1 className="display-1 mt-1">How can we help?</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {CARDS.map((c) => (
          <Link key={c.h} href={c.h} className="glass rounded-2xl p-5">
            <p className="font-bold">{c.t}</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{c.d}</p>
          </Link>
        ))}
      </div>
      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        Urgent (site down, account locked)? Call <a className="underline" href={`tel:${CONTACT.phone}`}>{CONTACT.phone}</a> Mon–Sat, 10:30 AM–7 PM IST.
      </p>
    </div>
  );
}
