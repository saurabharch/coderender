import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/store";
import { requireTeam } from "@/lib/auth";
import { runNightlyDistill } from "@/lib/learn";

async function runNow() {
  "use server";
  await requireTeam();
  await runNightlyDistill(3);
  revalidatePath("/admin/learn");
}

async function remove(form: FormData) {
  "use server";
  await requireTeam();
  getDb().prepare("DELETE FROM Distill WHERE id=?").run(Number(form.get("id")));
  revalidatePath("/admin/learn");
}

export default async function LearnAdmin() {
  const rows = getDb().prepare("SELECT * FROM Distill ORDER BY id DESC LIMIT 50").all() as
    { id: number; input: string; better: string; source: string; uses: number; createdAt: string }[];
  return (
    <>
      <h1 className="text-2xl font-extrabold">Self-learning</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Nightly (02:00 IST) the agent distills weak turns into exemplars via local inference.
        Answers retrieve the closest exemplar by vector similarity. Redacted, capped, prunable.
      </p>
      <form action={runNow} className="mt-3">
        <button className="min-h-[44px] rounded-full border border-black/15 px-5 text-sm font-semibold dark:border-white/20">Distill now (max 3)</button>
      </form>
      <ul className="mt-4 space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
            <p className="text-zinc-500">IN: {r.input}</p>
            <p className="mt-1"><b>OUT:</b> {r.better}</p>
            <p className="mt-1 text-xs text-zinc-500">{r.source} · used {r.uses}× · {r.createdAt.slice(0, 10)}</p>
            <form action={remove} className="mt-1"><input type="hidden" name="id" value={r.id} />
              <button className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">Delete</button></form>
          </li>
        ))}
        {rows.length === 0 && <li className="text-zinc-500">No exemplars yet — downvote answers or wait for the nightly run.</li>}
      </ul>
    </>
  );
}
