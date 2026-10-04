import type { Metadata } from "next";
import { CONTACT } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy — CodeRender",
  description: "How CodeRender collects, uses, stores, and protects your information across the website, chat, forms, and client work.",
  keywords: ["coderender privacy policy", "data protection", "whatsapp data", "lead data privacy"],
};

const SECTIONS: { h: string; body: string[] }[] = [
  {
    h: "What we collect",
    body: [
      "Contact details you share: name, phone number or email, business type, and your message — via forms, chat, calls, or WhatsApp.",
      "Technical basics: pages you visit and anonymous usage counts that help us fix slow or broken pages. No advertising trackers, no data brokers.",
      "Client work essentials: only the logins and assets needed to do the job (for example your Google Business Profile or ad account access), shared by you directly.",
    ],
  },
  {
    h: "How we use it",
    body: [
      "To reply to you, prepare quotes, deliver the services you bought, and send service updates (booking confirmations, report links, renewal reminders).",
      "To improve CodeRender: aggregated, de-identified statistics only. We never sell your data and never share it with advertisers.",
      "Support tickets and chat transcripts stay inside our own database so any teammate can pick up where the last one left off.",
    ],
  },
  {
    h: "Sharing and processors",
    body: [
      "We share data only to run your services and only on your instruction — for example Meta or Google when you approve an ad account connection, or WhatsApp when you tap a chat link (their policies apply once you leave our site).",
      "We do not share enquiry data between clients. Your leads, customers, and numbers are never shown to anyone else.",
    ],
  },
  {
    h: "Storage and security",
    body: [
      "Indian hosting with encrypted connections (HTTPS) throughout. Access is limited to the CodeRender team on a need-to-know basis.",
      "Least-access credentials on client accounts; we prefer client-owned accounts where you can revoke us any time. Secrets live in server configuration, never in files or chat logs.",
      "Magic links and one-time codes expire quickly (15 minutes); sessions expire after 30 days of inactivity.",
    ],
  },
  {
    h: "Retention",
    body: [
      "Enquiries: kept while the conversation is live plus 12 months for follow-up, then deleted on request any time.",
      "Client records (orders, payments, reports): kept for the account lifetime plus 3 years for tax and dispute records.",
      "Backups rotate automatically; deleted data disappears from backups within 30 days.",
    ],
  },
  {
    h: "Your rights",
    body: [
      "Ask for a copy of your data, a correction, or full deletion — write to the email below and we act within 7 working days.",
      "Opt out of broadcasts any time by replying STOP on WhatsApp or unsubscribing from any email.",
      "Deletion requests also remove you from analytics and marketing lists; tax records we must legally keep are anonymised where possible.",
    ],
  },
  {
    h: "Grievances",
    body: [
      "Privacy complaints go to our grievance officer at the email below with subject “Privacy”. Acknowledgement within 48 hours, resolution within 30 days — see our Grievance Redressal Policy for the full ladder.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="wrap section max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Legal</p>
      <h1 className="display-1 mt-1">Privacy Policy</h1>
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
          Questions or deletion requests: <a className="underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> · <a className="underline" href={`tel:${CONTACT.phone}`}>{CONTACT.phone}</a> (Mon–Sat).
        </p>
      </div>
    </div>
  );
}
