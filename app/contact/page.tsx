import type { Metadata } from "next";
import { CONTACT } from "@/lib/site";
import { LeadForm } from "@/components/lead-form";
import { PushDialogue } from "@/components/push-dialogue";
import { MessageCircle, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact us — CodeRender",
  description: "Request a callback on WhatsApp or the form. Reply within one business day, Mon–Sat.",
};

export default function ContactPage() {
  return (
    <div className="wrap section max-w-6xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Company</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">Talk to a human.</h1>
      <p className="mt-3 max-w-xl text-zinc-600 dark:text-zinc-400">Skip the forms if you prefer — get a real plan for your business on WhatsApp, Mon–Sat.</p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <a href={CONTACT.whatsapp} className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">
              <MessageCircle size={18} /> WhatsApp us
            </a>
            <a href={`tel:${CONTACT.phone}`} className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-black/15 px-4 py-3 text-sm font-semibold dark:border-white/20">
              <Phone size={18} /> {CONTACT.phone}
            </a>
          </div>
          <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
            <p className="font-bold">What happens next</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              <li>You send your business name + city.</li>
              <li>We reply within one business day with 3 specific fixes.</li>
              <li>You pick: fixed-price audit, growth pack, or retainer.</li>
            </ol>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Prefer email? <a className="underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> · Prefer SMS? <a className="underline" href={`sms:${CONTACT.phone}`}>{CONTACT.phone}</a></p>
        </div>
        <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-bold">Request a callback</h2>
          <div className="mt-3"><LeadForm source="contact" /></div>
          <div className="mt-4"><PushDialogue /></div>
        </div>
      </div>
    </div>
  );
}
