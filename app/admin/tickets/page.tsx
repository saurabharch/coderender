import Link from "next/link";
import { getDb } from "@/lib/store";

const TABS = ["open", "pending", "resolved", "closed", "spam"] as const;

export default async function TicketsAdmin({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const tab = (TABS as readonly string[]).includes(sp.status ?? "") ? sp.status! : "open";
  const rows = getDb().prepare("SELECT * FROM Ticket WHERE status=? ORDER BY id DESC LIMIT 100").all(tab) as
    { id: number; email: string; subject: string; status: string; assigneeEmail: string; escalated: number; createdAt: string }[];
  const counts = getDb().prepare("SELECT status, COUNT(*) n FROM Ticket GROUP BY status").all() as
    { status: string; n: number }[];
  const n = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  return (
    <>
      <h1 className="text-2xl font-extrabold">Support tickets</h1>
      <nav className="mt-3 flex flex-wrap gap-2" aria-label="Queues">
        {TABS.map((t) => (
          <Link key={t} href={`/admin/tickets?status=${t}`}
            className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold ${t === tab ? "bg-brand text-white" : "border border-black/15 dark:border-white/20"}`}>
            {t} ({n(t)})
          </Link>
        ))}
      </nav>
      <ul className="mt-4 space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
            <p>
              <Link href={`/admin/tickets/${r.id}`} className="font-bold underline">#{r.id} {r.subject}</Link>
              {r.escalated ? <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-bold text-red-700">escalated</span> : null}
            </p>
            <p className="mt-0.5 font-mono text-xs text-zinc-500">{r.email}{r.assigneeEmail ? ` → ${r.assigneeEmail}` : ""} · {r.createdAt.slice(0, 16).replace("T", " ")}</p>
          </li>
        ))}
        {rows.length === 0 && <li className="text-zinc-500">Queue empty.</li>}
      </ul>
    </>
  );
}
