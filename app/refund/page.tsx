import type { Metadata } from "next";
import { CONTACT } from "@/lib/site";

export const metadata: Metadata = {
  title: "Refund Policy — CodeRender",
  description: "When CodeRender refunds, how much, how fast, and how to ask — plain rules for audits, projects, and retainers.",
  keywords: ["coderender refund policy", "refund", "cancellation", "money back"],
};

const SECTIONS: { h: string; body: string[] }[] = [
  {
    h: "The short version",
    body: [
      "If we have not started your work, you get a 100% refund. If we have, you pay only for what is done and delivered — the rest comes back.",
      "Ad spend paid to Google/Meta is never in our hands, so only they can refund it. Domain, hosting, and WhatsApp API charges follow the provider's own policy.",
    ],
  },
  {
    h: "Audits and fixed-price diagnostics",
    body: [
      "Audits are delivered as a written report within the promised time. If the report is late by over 7 working days through our fault, the audit fee is credited in full toward any pack — or refunded if you prefer to walk away.",
      "If the audit shows we cannot help you (wrong fit, platform limits), we say so in writing and refund any unstarted follow-on advance in full.",
    ],
  },
  {
    h: "One-time projects (websites, setups, sprints)",
    body: [
      "Before kickoff (advance paid, work not started): full refund within 7 working days of your written cancellation.",
      "After kickoff: the advance covers discovery and booked calendar time; the balance adjusts to delivered milestones. You receive working files for everything paid for.",
      "If we miss a committed delivery date by over 15 working days without an agreed extension, you may cancel for a pro-rata refund of undelivered milestones.",
    ],
  },
  {
    h: "Monthly retainers",
    body: [
      "Cancel with 15 days written notice; the current month runs to its end and is not refunded (posts, replies, and monitoring are already scheduled).",
      "Future months never charge after a valid cancellation. If we fail to deliver a month's core rhythm (posts + review replies + report) without cause, that month is credited or refunded — your choice.",
      "Pause instead of cancel any time: up to 60 days a year, billing resumes when work resumes.",
    ],
  },
  {
    h: "How to ask",
    body: [
      "Write to the email below or raise a ticket from the Support page with your order or invoice number and the reason.",
      "We acknowledge within 48 hours and decide within 7 working days. Approved refunds go to the original payment method within 7 more working days (banks can add their own delay).",
      "Disagree with the decision? Escalate free through the Grievance Redressal ladder — refunds stay on the table during escalation.",
    ],
  },
  {
    h: "What is never refundable",
    body: [
      "Third-party spend and fees: Google/Meta ads, domains, hosting, WhatsApp conversation charges, app-store or SMS charges.",
      "Work already delivered and approved by you (two revision rounds are included to get it right first).",
      "Discounts or credits already consumed on a later invoice.",
    ],
  },
];

export default function RefundPage() {
  return (
    <div className="wrap section max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Legal</p>
      <h1 className="display-1 mt-1">Refund Policy</h1>
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
          Start a refund: <a className="underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> · <a className="underline" href="/support/ticket">Raise a ticket</a>
        </p>
      </div>
    </div>
  );
}
