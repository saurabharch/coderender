import Link from "next/link";
import { PageHead } from "@/components/admin-ui";
import { listCustomers } from "@/lib/commerce";
import { segment } from "@/lib/crm";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const rows = listCustomers(q, 50) as { id: number; name: string; phone: string; stage: string }[];
  return (
    <>
      <PageHead eyebrow="Engage" title="Customers" blurb="Directory with pipeline stage, segment and lifetime spend. Full profile in CRM lookup." />
      <form className="mb-3 flex gap-1.5" action="/admin/customers">
        <input name="q" defaultValue={q} placeholder="Search name or phone…" maxLength={60}
          className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <button className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Search</button>
      </form>
      <ul className="space-y-1 text-sm">
        {rows.map((c) => {
          const s = segment(c.id);
          return (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
              <span>#{c.id} <b>{c.name}</b> {c.phone && <span className="text-zinc-500">{c.phone}</span>}</span>
              <span className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-black/5 px-2 py-0.5 dark:bg-white/10">{c.stage}</span>
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-brand-deep">{s.segment}</span>
                <span>₹{(s.spend / 100).toFixed(0)}</span>
                <Link href={`/admin/crm?id=${c.id}`} className="font-semibold text-brand-deep underline">profile →</Link>
              </span>
            </li>
          );
        })}
        {rows.length === 0 && <li className="text-sm text-zinc-500">No customers yet.</li>}
      </ul>
    </>
  );
}
