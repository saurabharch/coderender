import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/store";
import { requireTeam } from "@/lib/auth";
import { nextSlots } from "@/lib/slots";
import { Empty, PageHead } from "@/components/admin-ui";
import { AvatarInitials, StatusBadge } from "@/components/admin-ux";

async function setStatus(form: FormData) {
  "use server";
  await requireTeam();
  const s = String(form.get("status"));
  if (!["proposed", "confirmed", "done", "cancelled"].includes(s)) return;
  getDb().prepare("UPDATE Appointment SET status=? WHERE id=?").run(s, Number(form.get("id")));
  revalidatePath("/admin/schedule");
}

async function reschedule(form: FormData) {
  "use server";
  const me = await requireTeam();
  const { rescheduleMeeting } = await import("@/lib/notify");
  await rescheduleMeeting(Number(form.get("id")), String(form.get("slot") || ""), me.email);
  revalidatePath("/admin/schedule");
}

export default async function SchedulePage() {
  const rows = getDb().prepare("SELECT * FROM Appointment ORDER BY id DESC LIMIT 200").all() as
    { id: number; name: string; contact: string; mode: string; slot: string; status: string; createdAt: string }[];
  const slots = nextSlots();
  const upcoming = rows.filter((r) => r.status === "confirmed" || r.status === "proposed");
  const past = rows.filter((r) => r.status === "done" || r.status === "cancelled");
  const isStale = (createdAt: string) => Date.now() - new Date(createdAt).getTime() > 2 * 864e5;
  const card = (r: (typeof rows)[number]) => {
    const stale = (r.status === "proposed" || r.status === "confirmed") && isStale(r.createdAt);
    return (
      <li key={r.id} className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <AvatarInitials name={r.name} size="sm" />
          <b className="text-base">{r.slot || "unscheduled"}</b>
          <span className="min-w-0 truncate font-semibold">{r.name}</span>
          <StatusBadge status={r.status} />
          {stale && <span className="text-xs font-semibold text-amber-600">stale — confirm or cancel</span>}
        </p>
        <p className="mt-0.5 truncate text-xs text-zinc-500">{r.contact || "no contact"} · {r.mode || "no mode"}</p>
        <div className="mt-2 grid gap-1.5 sm:flex sm:flex-wrap">
          <form action={setStatus} className="flex min-w-0 flex-1 flex-wrap gap-1.5 sm:flex-none">
            <input type="hidden" name="id" value={r.id} />
            <select name="status" defaultValue={r.status} aria-label="Meeting status"
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
              {["proposed", "confirmed", "done", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="min-h-[44px] shrink-0 rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Set</button>
          </form>
          {(r.status === "proposed" || r.status === "confirmed") && (
            <form action={reschedule} className="flex min-w-0 flex-1 flex-wrap gap-1.5 sm:flex-none">
              <input type="hidden" name="id" value={r.id} />
              <select name="slot" defaultValue={r.slot} required aria-label="New slot"
                className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
                {r.slot && <option value={r.slot}>Keep: {r.slot}</option>}
                {slots.filter((s) => s.id !== r.slot).map((s) => <option key={s.id} value={s.id}>{s.label} (reschedule + notify)</option>)}
              </select>
              <button className="min-h-[44px] shrink-0 rounded-xl bg-brand px-4 text-sm font-semibold text-white">Reschedule</button>
            </form>
          )}
        </div>
      </li>
    );
  };
  return (
    <>
      <PageHead eyebrow="Operations" title="Meeting schedule"
        blurb="Chat bookings land here — confirm, reschedule or close them. Stale ones need attention." />
      <h2 className="mt-4 font-bold">Upcoming ({upcoming.length})</h2>
      {upcoming.length === 0 ? (
        <div className="mt-2"><Empty>Nothing scheduled — bookings from the chat widget land here.</Empty></div>
      ) : (
        <ul className="mt-2 space-y-2">{upcoming.map(card)}</ul>
      )}
      <h2 className="mt-6 font-bold">History ({past.length})</h2>
      {past.length === 0 ? (
        <div className="mt-2"><Empty>No closed meetings yet.</Empty></div>
      ) : (
        <ul className="mt-2 space-y-2">{past.map(card)}</ul>
      )}
    </>
  );
}
