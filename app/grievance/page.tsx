import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT } from "@/lib/site";

export const metadata: Metadata = {
  title: "Grievance Redressal Policy — CodeRender",
  description: "How CodeRender handles complaints and escalations: levels, timelines, and the grievance officer.",
  keywords: ["grievance redressal", "complaint escalation", "grievance officer"],
};

const LADDER = [
  { t: "Level 1 — Support (same day to 7 days)", d: "Raise a ticket or write in. We acknowledge within 24 hours and resolve or explain within 7 working days. Most issues end here." },
  { t: "Level 2 — Grievance officer (30 days)", d: `Write to ${CONTACT.email} with subject “Grievance” plus your ticket or order number. Acknowledgement in 48 hours, written decision within 30 days. Refunds stay on the table during escalation.` },
  { t: "Level 3 — Founder review (15 days)", d: "Still unhappy? Reply “escalate to founder” on the same thread. A founder reviews the full file and gives a final written answer within 15 working days." },
  { t: "Level 4 — External", d: "Indian consumers keep every statutory remedy (consumer commissions, cyber-crime reporting for fraud). We comply with lawful orders and cooperate fully." },
];

export default function GrievancePage() {
  return (
    <div className="wrap section max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Legal</p>
      <h1 className="display-1 mt-1">Grievance Redressal Policy</h1>
      <p className="mt-2 text-xs text-zinc-500">Last updated: October 2026 · CodeRender Studio, India</p>
      <div className="mt-6 space-y-3">
        {LADDER.map((l, i) => (
          <section key={l.t} className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <p className="font-bold">Step {i + 1}: {l.t}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">{l.d}</p>
          </section>
        ))}
        <section className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="font-bold">Grievance officer</p>
          <p className="mt-1 text-[15px] text-zinc-600 dark:text-zinc-400">
            Email <a className="underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> · Phone <a className="underline" href={`tel:${CONTACT.phone}`}>{CONTACT.phone}</a> (Mon–Sat, 10:30 AM–7 PM IST). Include your ticket/order number and what “fixed” looks like to you.
          </p>
        </section>
        <p className="text-[15px] text-zinc-600 dark:text-zinc-400">
          Start here: <Link href="/support/ticket" className="font-semibold text-brand-deep underline">Raise a ticket →</Link>
        </p>
      </div>
    </div>
  );
}
