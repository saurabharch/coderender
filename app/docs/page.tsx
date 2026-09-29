import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Docs — CodeRender",
  description: "How CodeRender works: the weekly rhythm, the leads API, and where to get help.",
};

const SECTIONS = [
  ["The weekly rhythm", "Monday posts go live. Wednesday review replies + chat training. Friday offer broadcast. Sunday one-page report."],
  ["Leads API", "Every form on this site POSTs JSON {name, phone, businessType, source, message} to /api/leads (zod-validated, 422 on bad input). Stored in SQLite on-device; Postgres-ready schema in prisma/."],
  ["Theme + mobile", "Light/dark/system via next-themes, mobile-only quick-action bar, 44px tap targets, reduced-motion respected."],
  ["Getting help", "WhatsApp first (Mon–Sat), then email, then the contact form. Partners get a dedicated human."],
];

export default function DocsPage() {
  return (
    <div className="wrap section max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Resources</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">Docs</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">The short version of how everything here works.</p>
      <div className="mt-6 grid gap-4">
        {SECTIONS.map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
            <p className="font-bold">{t}</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{d}</p>
          </div>
        ))}
      </div>
      <Link href="/contact" className="mt-6 inline-flex min-h-[44px] items-center font-semibold underline">Still stuck? Talk to us →</Link>
    </div>
  );
}
