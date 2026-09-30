import { revalidatePath } from "next/cache";
import { getDb, getPref, setPref } from "@/lib/store";
import { sendDailyReport } from "@/lib/reporter";
import { sessionUser } from "@/lib/auth";
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

async function revokeSession(form: FormData) {
  "use server";
  const me = await sessionUser();
  if (!me || me.role !== "owner") return;
  getDb().prepare("DELETE FROM Session WHERE id=?").run(Number(form.get("id")));
  revalidatePath("/admin/settings");
}

async function setRole(form: FormData) {
  "use server";
  const me = await sessionUser();
  if (!me || me.role !== "owner") return;
  const email = String(form.get("email"));
  const role = String(form.get("role"));
  if (!["owner", "member"].includes(role) || email === me.email) return;
  getDb().prepare("UPDATE AppUser SET role=? WHERE email=?").run(role, email);
  getDb().prepare("UPDATE Membership SET role=? WHERE userId=(SELECT id FROM AppUser WHERE email=?)").run(role, email);
  revalidatePath("/admin/settings");
}

async function savePrices(form: FormData) {
  "use server";
  const me = await sessionUser();
  if (!me || me.role !== "owner") return;
  const num = (k: string, fb: number) => {
    const n = Number(form.get(k));
    return Number.isFinite(n) && n > 0 ? Math.round(n) : fb;
  };
  const cur = JSON.parse(getPref("site_prices", "{}") || "{}");
  setPref("site_prices", JSON.stringify({
    audit: num("audit", cur.audit ?? 2999),
    packFrom: num("packFrom", cur.packFrom ?? 14999),
    siteFrom: num("siteFrom", cur.siteFrom ?? 29999),
    retainerFrom: num("retainerFrom", cur.retainerFrom ?? 11999),
    leadsFrom: num("leadsFrom", cur.leadsFrom ?? 19999),
    currency: "₹",
  }));
  revalidatePath("/admin/settings");
  revalidatePath("/pricing");
}

export default async function SettingsPage() {
  const team = getDb().prepare(
    `SELECT u.email, u.role, m.role mrole FROM AppUser u LEFT JOIN Membership m ON m.userId=u.id ORDER BY u.id`).all() as
    { email: string; role: string; mrole: string | null }[];
  const notifs = getDb().prepare("SELECT COUNT(*) c FROM Notification").get() as { c: number };
  const sessions = getDb().prepare(
    `SELECT s.id, u.email, s.expiresAt FROM Session s JOIN AppUser u ON u.id=s.userId ORDER BY s.id DESC LIMIT 50`).all() as
    { id: number; email: string; expiresAt: string }[];
  let prices: Record<string, number> = {};
  try { prices = JSON.parse(getPref("site_prices", "{}") || "{}"); } catch { /* defaults */ }
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
      <ul className="mt-2 space-y-2 text-sm">
        {team.map((t) => (
          <li key={t.email} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10">
            <span>{t.email} · {t.role}{t.mrole ? ` / ${t.mrole}` : ""}</span>
            <form action={setRole} className="flex gap-2">
              <input type="hidden" name="email" value={t.email} />
              <select name="role" defaultValue={t.role} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 dark:border-white/20">
                <option value="member">member</option>
                <option value="owner">owner</option>
              </select>
              <button className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">Set</button>
            </form>
          </li>
        ))}
        {team.length === 0 && <li className="text-zinc-500">Nobody signed in yet — magic links admit owner emails.</li>}
      </ul>
      <h2 className="mt-6 font-bold">Active sessions ({sessions.length})</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {sessions.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10">
            <span>#{s.id} {s.email} · expires {s.expiresAt.slice(0, 10)}</span>
            <form action={revokeSession}><input type="hidden" name="id" value={s.id} />
              <button className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">Revoke</button></form>
          </li>
        ))}
      </ul>
      <h2 className="mt-6 font-bold">Site prices (₹ — live on pricing page, calculator, agent)</h2>
      <form action={savePrices} className="mt-2 grid max-w-xl grid-cols-2 gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10 md:grid-cols-3">
        {[["audit", "Audit"], ["packFrom", "Pack from"], ["siteFrom", "Site from"], ["retainerFrom", "Retainer/mo"], ["leadsFrom", "Leads/mo"]].map(([k, l]) => (
          <label key={k} className="grid gap-1 text-sm">{l}
            <input name={k} inputMode="numeric" defaultValue={prices[k] ?? ""} placeholder="default"
              className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
          </label>
        ))}
        <button className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white md:col-span-3 md:w-fit">Save prices</button>
      </form>
      <p className="mt-2 text-sm text-zinc-500">Broadcasts sent: {notifs.c} · Org: CodeRender (id 1) · preferences stored per key.</p>
    </>
  );
}
