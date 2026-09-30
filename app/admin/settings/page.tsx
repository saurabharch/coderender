import { revalidatePath } from "next/cache";
import { getDb, getPref, setPref } from "@/lib/store";
import { sendDailyReport } from "@/lib/reporter";
import { requireTeam } from "@/lib/auth";

async function save(form: FormData) {
  "use server";
  await requireTeam();
  for (const k of ["daily_report", "contact_phone", "contact_email", "partner_plan"]) {
    const v = form.get(k);
    if (typeof v === "string") setPref(k, v.slice(0, 4000));
  }
  revalidatePath("/admin/settings");
}

async function runReport() {
  "use server";
  await requireTeam();
  await sendDailyReport();
  revalidatePath("/admin/settings");
}

async function runInfra() {
  "use server";
  await requireTeam();
  const { infraCheck, reportInfraTrouble } = await import("@/lib/infra");
  await reportInfraTrouble(infraCheck());
  revalidatePath("/admin/settings");
}

export default async function SettingsPage() {
  const team = getDb().prepare(
    `SELECT u.email, u.role, m.role mrole FROM AppUser u LEFT JOIN Membership m ON m.userId=u.id ORDER BY u.id`).all() as
    { email: string; role: string; mrole: string | null }[];
  const notifs = getDb().prepare("SELECT COUNT(*) c FROM Notification").get() as { c: number };
  return (
    <>
      <h1 className="text-2xl font-extrabold">Settings & team</h1>
      <form action={save} className="mt-4 grid max-w-xl gap-3 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <label className="flex min-h-[44px] items-center gap-2 text-sm">
          <input type="checkbox" name="daily_report" value="on" defaultChecked={getPref("daily_report", "on") === "on"} className="h-5 w-5" />
          Daily owner report email (23:55 IST)
        </label>
        <label className="grid gap-1 text-sm">Contact phone (overrides env in reports)
          <input name="contact_phone" defaultValue={getPref("contact_phone", "")} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
        <label className="grid gap-1 text-sm">Contact email
          <input name="contact_email" defaultValue={getPref("contact_email", "")} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
        <button className="min-h-[44px] w-fit rounded-xl bg-brand px-5 text-sm font-semibold text-white">Save</button>
      </form>
      <form action={runReport} className="mt-3">
        <button className="min-h-[44px] rounded-full border border-black/15 px-5 text-sm font-semibold dark:border-white/20">Send report now (to owner emails)</button>
      </form>
      <form action={runInfra} className="mt-2">
        <button className="min-h-[44px] rounded-full border border-black/15 px-5 text-sm font-semibold dark:border-white/20">Run infra check now</button>
      </form>
      <h2 className="mt-6 font-bold">Team ({team.length})</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {team.map((t) => <li key={t.email}>{t.email} · {t.role}{t.mrole ? ` / ${t.mrole}` : ""}</li>)}
        {team.length === 0 && <li className="text-zinc-500">Nobody signed in yet — magic links admit owner emails.</li>}
      </ul>
      <p className="mt-2 text-sm text-zinc-500">Broadcasts sent: {notifs.c} · Org: CodeRender (id 1) · preferences stored per key.</p>
    </>
  );
}
