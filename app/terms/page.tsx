import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — CodeRender",
  description: "The terms that govern CodeRender services.",
};

export default function TermsPage() {
  return (
    <div className="wrap section max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Legal</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Terms & Conditions</h1>
      <div className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
        <p>Every engagement runs on a written scope: deliverables, timeline, exclusions, and a change-request rule. If it is not in the scope, it is not included.</p>
        <p>We promise deliverables and effort — never rankings, revenue, or virality. Marketing outcomes depend on factors nobody controls.</p>
        <p>Retainers are capped monthly quotas, pausable with 15 days notice. Projects start on advance as agreed in writing.</p>
        <p>All prices on this site are DRAFT until confirmed in your proposal.</p>
      </div>
    </div>
  );
}
