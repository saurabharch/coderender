import type { Metadata } from "next";
import { LeadForm } from "@/components/lead-form";

export const metadata: Metadata = {
  title: "Contact us — CodeRender",
  description: "Request a callback on WhatsApp or the form. Reply within one business day, Mon–Sat.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-extrabold md:text-5xl">Contact us</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">Skip the forms if you prefer — reply on WhatsApp in minutes, Mon–Sat.</p>
      <div className="mt-6 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <LeadForm source="contact" />
      </div>
    </div>
  );
}
