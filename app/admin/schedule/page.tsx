import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/store";
import { requireTeam } from "@/lib/auth";

async function setStatus(form: FormData) {
  "use server";
  await requireTeam();
  const s = String(form.get("status"));
  if (!["proposed", "confirmed", "done", "cancelled"].includes(s)) return;
  getDb().prepare("UPDATE Appointment SET status=? WHERE id=?").run(s, Number(form.get("id")));
  revalidatePath("/admin/schedule");
}

export default async function SchedulePage() {
  const rows = getDb().prepare("SELECT * FROM Appointment ORDER BY id DESC LIMIT 200").all() as
    { id: number; name: string; contact: string; mode: string; slot: string; status: string; createdAt: string }[];
  const upcoming = rows.filter((r) => r.status === "confirmed" || r.status === "proposed");
  const past = rows.filter((r) => r.status === "done" || r.status === "cancelled");
  const isStale = (createdAt: string) => Date.now() - new Date(createdAt).getTime() > 2 * 864e5;
  const card = (r: (typeof rows)[number]) => (
    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10">
      <span className="text-sm"><b>{r.slot || "unscheduled"}</b> · {r.name} · {r.contact} · {r.mode} · <b>{r.status}</b>
        {(r.status === "proposed" || r.status === "confirmed") && isStale(r.createdAt) && <em className="ml-1 text-amber-600">· stale, confirm or cancel</em>}
      </span>
      <form action={setStatus} className="flex gap-2">
        <input type="hidden" name="id" value={r.id} />
        <select name="status" defaultValue={r.status} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
          {["proposed", "confirmed", "done", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="min-h-[44px] rounded-xl border border-black/15 px-3 text-sm dark:border-white/20">Set</button>
      </form>
    </li>
  );
  return (
    <>
      <h1 className="text-2xl font-extrabold">Meeting schedule</h1>
      <h2 className="mt-4 font-bold">Upcoming ({upcoming.length})</h2>
      <ul className="mt-2 space-y-2">{upcoming.map(card)}
        {upcoming.length === 0 && <li className="text-sm text-zinc-500">Nothing scheduled — bookings from the chat widget land here.</li>}
      </ul>
      <h2 className="mt-6 font-bold">History ({past.length})</h2>
      <ul className="mt-2 space-y-2">{past.map(card)}</ul>
    </>
  );
}
