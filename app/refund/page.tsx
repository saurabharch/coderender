import type { Metadata } from "next";
import { CONTACT } from "@/lib/site";

export const metadata: Metadata = {
  title: "Refund Policy — CodeRender",
  description: "How refunds work at CodeRender.",
};

export default function RefundPage() {
  return (
    <div className="wrap section max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Legal</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Refund Policy</h1>
      <div className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
        <p>Audits are refundable before delivery starts. Once delivered, the audit fee converts to credit toward any pack.</p>
        <p>Projects: milestones already delivered are billed; undelivered milestones are refunded in full.</p>
        <p>Retainers: cancel with 15 days notice; unused days in the current cycle are refunded pro-rata.</p>
        <p>Write to <a className="underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> — refunds resolve within 7 business days.</p>
      </div>
    </div>
  );
}
