import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/store";
import { requireTeam } from "@/lib/auth";

const STAGES = ["new", "contacted", "qualified", "won", "lost"] as const;

async function move(form: FormData) {
  "use server";
  await requireTeam();
  const to = String(form.get("to"));
  if (!(STAGES as readonly string[]).includes(to)) return;
  getDb().prepare("UPDATE Lead SET status=? WHERE id=?").run(to, Number(form.get("id")));
  revalidatePath("/admin/pipeline");
}

export default async function PipelinePage() {
  const leads = getDb().prepare("SELECT id, name, phone, businessType, status FROM Lead ORDER BY id DESC LIMIT 300").all() as
    { id: number; name: string; phone: string; businessType: string; status: string }[];
  return (
    <>
      <h1 className="text-2xl font-extrabold">Pipeline (Kanban)</h1>
      <p className="mt-1 text-sm text-zinc-500">Move cards between stages — no drag library needed, every move is a tap.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-5">
        {STAGES.map((s) => (
          <div key={s} className="rounded-2xl border border-black/10 p-2 dark:border-white/10">
            <p className="px-1 text-xs font-extrabold uppercase tracking-widest text-zinc-500">{s} ({leads.filter((l) => (l.status || "new") === s).length})</p>
            <div className="mt-1 space-y-1">
              {leads.filter((l) => (l.status || "new") === s).map((l) => (
                <div key={l.id} className="rounded-xl bg-zinc-100 p-2 text-xs dark:bg-white/10">
                  <p className="font-bold">#{l.id} {l.name}</p>
                  <p className="text-zinc-500">{l.phone} · {l.businessType}</p>
                  <form action={move} className="mt-1 flex gap-1">
                    <input type="hidden" name="id" value={l.id} />
                    <select name="to" defaultValue={l.status || "new"} className="min-h-[36px] rounded-lg border border-black/15 bg-transparent px-1 dark:border-white/20">
                      {STAGES.map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                    <button className="min-h-[36px] rounded-lg border border-black/15 px-2 dark:border-white/20">→</button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
