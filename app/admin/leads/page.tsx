import Link from "next/link";
import { getDb } from "@/lib/store";

const COLS = ["id", "name", "phone", "businessType", "source", "createdAt"] as const;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ sort?: string; dir?: string }> }) {
  const sp = await searchParams;
  const sort = (COLS as readonly string[]).includes(sp.sort ?? "") ? sp.sort! : "id";
  const dir = sp.dir === "asc" ? "ASC" : "DESC";
  const rows = getDb().prepare(`SELECT * FROM Lead ORDER BY ${sort} ${dir} LIMIT 200`).all() as
    { id: number; name: string; phone: string; businessType: string; source: string; fingerprint: string | null; createdAt: string }[];
  const flip = (c: string) => `/admin/leads?sort=${c}&dir=${sort === c && dir === "DESC" ? "asc" : "desc"}`;
  return (
    <>
      <h1 className="text-2xl font-extrabold">Leads ({rows.length})</h1>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10">
              {COLS.map((c) => (
                <th key={c} className="px-3 py-2"><Link className="underline" href={flip(c)}>{c}{sort === c ? (dir === "DESC" ? " ↓" : " ↑") : ""}</Link></th>
              ))}
              <th className="px-3 py-2">fp</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-black/5 dark:border-white/5">
                <td className="px-3 py-2">{r.id}</td>
                <td className="px-3 py-2 font-semibold">{r.name}</td>
                <td className="px-3 py-2">{r.phone}</td>
                <td className="px-3 py-2">{r.businessType}</td>
                <td className="px-3 py-2">{r.source}</td>
                <td className="px-3 py-2">{r.createdAt.slice(0, 16).replace("T", " ")}</td>
                <td className="px-3 py-2 text-xs text-zinc-500">{r.fingerprint ? r.fingerprint.slice(0, 8) + "…" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
