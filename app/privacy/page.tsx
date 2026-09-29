import type { Metadata } from "next";
import { CONTACT } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy — CodeRender",
  description: "How CodeRender collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <div className="wrap section max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Legal</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
      <div className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
        <p>We collect only what callbacks need: your name, phone, business type, and message. Stored in our own database, never sold, never shared with advertisers.</p>
        <p>WhatsApp and call links open your own apps — those platforms apply their own policies once you leave this site.</p>
        <p>We use least-access credentials on client accounts and never store passwords or API secrets in files.</p>
        <p>Questions or deletion requests: <a className="underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.</p>
      </div>
    </div>
  );
}
