import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VERTICALS } from "@/lib/site";
import { LeadForm } from "@/components/lead-form";

export function generateStaticParams() {
  return VERTICALS.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const v = VERTICALS.find((x) => x.slug === slug);
  return {
    title: v ? `${v.label} — CodeRender` : "Industry — CodeRender",
    description: v?.blurb ?? "Local growth for your business type.",
  };
}

export default async function IndustryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = VERTICALS.find((x) => x.slug === slug);
  if (!v) notFound();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-deep">Coderender for</p>
      <h1 className="mt-2 text-3xl font-extrabold md:text-5xl">{v.label}</h1>
      <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">{v.blurb}</p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-bold">What you get</h2>
          <ul className="mt-2 list-disc pl-5 text-sm">
            <li>Google profile tuned to rank on Maps + Search</li>
            <li>Posts + review replies handled weekly</li>
            <li>WhatsApp instant replies in your tone + prices</li>
            <li>Offer broadcasts to past customers</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
          <h2 className="font-bold">Request a callback</h2>
          <div className="mt-3"><LeadForm source={`industry:${v.slug}`} /></div>
        </div>
      </div>
    </div>
  );
}
