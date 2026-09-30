import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/store";
import { requireTeam } from "@/lib/auth";

async function toggle(form: FormData) {
  "use server";
  await requireTeam();
  getDb().prepare("UPDATE Subscriber SET active = 1 - active WHERE id=?").run(Number(form.get("id")));
  revalidatePath("/admin/subscribers");
}

export default async function SubscribersPage() {
  const rows = getDb().prepare("SELECT * FROM Subscriber ORDER BY id DESC LIMIT 200").all() as
    { id: number; email: string; source: string; active: number; createdAt: string }[];
  return (
    <>
      <h1 className="text-2xl font-extrabold">Newsletter subscribers ({rows.length})</h1>
      <ul className="mt-4 space-y-2 text-sm">
        {rows.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 p-3 dark:border-white/10">
            <span>{s.email} · {s.source} · {s.active ? "active" : "off"}</span>
            <form action={toggle}><input type="hidden" name="id" value={s.id} />
              <button className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">{s.active ? "Unsub" : "Resub"}</button>
            </form>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-zinc-500">No subscribers yet — the footer form feeds this list.</li>}
      </ul>
    </>
  );
}
