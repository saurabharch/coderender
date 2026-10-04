import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT } from "@/lib/site";

export const metadata: Metadata = {
  title: "Complaint & Fraud Resolution — CodeRender",
  description: "Report misuse, impersonation, or suspected fraud involving CodeRender. Fast-track handling and safety guidance.",
  keywords: ["report fraud", "complaint", "impersonation", "scam report"],
};

export default function ComplaintsPage() {
  return (
    <div className="wrap section max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Safety</p>
      <h1 className="display-1 mt-1">Complaint & Fraud Resolution</h1>
      <div className="mt-6 space-y-6 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">
        <section>
          <h2 className="display-2">If money or access is at risk, act now</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Stop sharing codes, OTPs, or screen access with anyone claiming to be us — CodeRender never asks for your OTP, ever.</li>
            <li>We only ever contact you from <b>{CONTACT.email}</b>, <b>{CONTACT.phone}</b>, or this website. Any other number, email, or lookalike domain is not us.</li>
            <li>Never pay to personal UPI IDs or wallets for CodeRender invoices — pay only against a written invoice from the email above.</li>
          </ul>
        </section>
        <section>
          <h2 className="display-2">Report to us (fast-tracked)</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Raise a ticket with subject starting “FRAUD:” plus screenshots, numbers, and UPI IDs involved.</li>
            <li>Fraud and impersonation reports skip the normal queue: acknowledgement within 12 working hours, action plan within 3 working days.</li>
            <li>We preserve evidence, block abusive accounts on our systems, and confirm back what we did.</li>
          </ul>
        </section>
        <section>
          <h2 className="display-2">Report to authorities</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Financial fraud in India: call the cyber helpline <b>1930</b> immediately, then file at the national cyber-crime portal.</li>
            <li>Keep transaction IDs, screenshots, and call recordings — banks act fastest within the first hours.</li>
            <li>Share your complaint reference with us too, so our records match the official case.</li>
          </ul>
        </section>
        <p>
          <Link href="/support/ticket" className="font-semibold text-brand-deep underline">Raise a fraud ticket →</Link>
          {" · "}<Link href="/grievance" className="font-semibold text-brand-deep underline">Grievance ladder →</Link>
        </p>
      </div>
    </div>
  );
}
