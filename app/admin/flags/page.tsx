import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/store";
import { requireTeam } from "@/lib/auth";
import { SubTabs } from "@/components/admin-ui";
import { Ban, Flag } from "lucide-react";

async function unban(form: FormData) {
  "use server";
  await requireTeam();
  getDb().prepare("DELETE FROM RateBan WHERE key=?").run(String(form.get("key")));
  revalidatePath("/admin/flags");
}

export default async function FlagsPage({ searchParams }: { searchParams: Promise<{ q?: string; tab?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q || "").slice(0, 60);
  const tab = sp.tab === "bans" ? "bans" : "flags";
  const like = `%${q}%`;
  const flags = getDb().prepare(
    `SELECT * FROM BotFlag WHERE (? = '' OR reason LIKE ? OR fp LIKE ? OR ip LIKE ?) ORDER BY id DESC LIMIT 100`
  ).all(q, like, like, like) as
    { id: number; fp: string; ip: string; reason: string; score: number; locale: string; createdAt: string }[];
  const bans = getDb().prepare("SELECT * FROM RateBan ORDER BY until DESC LIMIT 50").all() as
    { key: string; until: number; level: number }[];
  const votes = getDb().prepare(
    "SELECT vote, COUNT(*) n FROM Vote GROUP BY vote").all() as { vote: string; n: number }[];
  return (
    <>
      <h1 className="text-2xl font-extrabold">Abuse console</h1>
      <SubTabs active={tab} label="Abuse" tabs={[
        { id: "flags", label: `Flags (${flags.length})`, Icon: Flag, href: "/admin/flags" },
        { id: "bans", label: "Bans", Icon: Ban, href: "/admin/flags?tab=bans" },
      ]} />
      {tab === "flags" && (<>
      <form method="get" className="mt-3 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Filter reason, fingerprint, IP…" aria-label="Filter flags"
          className="min-h-[44px] w-full max-w-sm rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <button className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Filter</button>
      </form>
      </>)}
      {tab === "bans" && (<>
      <h2 className="mt-6 font-bold">Active bans ({bans.filter((b) => b.until > Date.now()).length})</h2>
      <ul className="mt-2 space-y-1 font-mono text-xs">
        {bans.map((b) => (
          <li key={b.key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 p-2 dark:border-white/10">
            <span>{b.key} · level {b.level} · {b.until > Date.now() ? `until ${new Date(b.until).toLocaleString()}` : "expired"}</span>
            <form action={unban}><input type="hidden" name="key" value={b.key} />
              <button className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">Unban</button></form>
          </li>
        ))}
        {bans.length === 0 && <li className="text-sm text-zinc-500">No bans on record.</li>}
      </ul>
      </>)}
      <h2 className="mt-6 font-bold">Flags ({flags.length})</h2>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead><tr className="border-b border-black/10 dark:border-white/10">
            <th className="px-3 py-2">When</th><th className="px-3 py-2">Fingerprint</th>
            <th className="px-3 py-2">IP</th><th className="px-3 py-2">Locale</th>
            <th className="px-3 py-2">Reason</th><th className="px-3 py-2">Score</th>
          </tr></thead>
          <tbody>
            {flags.map((f) => (
              <tr key={f.id} className="border-b border-black/5 font-mono dark:border-white/5">
                <td className="px-3 py-2">{f.createdAt.slice(0, 16).replace("T", " ")}</td>
                <td className="px-3 py-2">{f.fp ? f.fp.slice(0, 12) + "…" : "—"}</td>
                <td className="px-3 py-2">{f.ip || "—"}</td>
                <td className="px-3 py-2">{f.locale || "—"}</td>
                <td className="px-3 py-2">{f.reason}</td>
                <td className="px-3 py-2 font-bold">{f.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="mt-6 font-bold">Answer votes</h2>
      <p className="mt-1 font-mono text-xs">{votes.map((v) => `${v.vote}: ${v.n}`).join(" · ") || "none yet"}</p>
    </>
  );
}
