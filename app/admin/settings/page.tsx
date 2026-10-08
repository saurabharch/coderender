import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, getPref, setPref } from "@/lib/store";
import { listTaxes } from "@/lib/commerce";
import { flagStates } from "@/lib/flags";
import { sendDailyReport } from "@/lib/reporter";
import { sessionUser } from "@/lib/auth";
import { requireTeam } from "@/lib/auth";
import { SubTabs } from "@/components/admin-ui";
import { QUICKBAR_ACTIONS, QUICKBAR_ROLES, quickbarCustom } from "@/lib/quickbar";
import { AtSign, Ban, Calculator, DatabaseBackup, Flag, IndianRupee, Mail, MonitorSmartphone, Phone, Puzzle, ReceiptText, ShieldCheck, SlidersHorizontal, Store, Timer, Users, Zap } from "lucide-react";

async function save(form: FormData) {
  "use server";
  await requireTeam();
  // Checkboxes: unchecked sends nothing, so write both states explicitly —
  // but only when the main settings form was submitted (the invites mini-form
  // must not wipe them).
  if (form.has("contact_phone")) {
    for (const k of ["daily_report", "backup"]) {
      setPref(k, form.get(k) === "on" ? "on" : "off");
    }
  }
  const invitesRaw = form.get("team_invites");
  if (typeof invitesRaw === "string") {
    const invites = invitesRaw.split(",")
      .map((s) => s.trim().toLowerCase()).filter((s) => s.includes("@")).slice(0, 50);
    setPref("team_invites", invites.join(", "));
  }
  for (const k of ["contact_phone", "contact_email", "partner_plan"]) {    const v = form.get(k);
    if (typeof v === "string") setPref(k, v.slice(0, 4000));
  }
  const bt = String(form.get("business_type") || "");
  if (["shop", "ecommerce", "clinic"].includes(bt)) setPref("business_type", bt);
  for (const k of ["sla_ack_hours", "sla_close_days"]) {
    const n = Math.max(1, Math.round(Number(form.get(k) || 0) || 0));
    if (n > 0) setPref(k, String(n));
  }
  const provider = String(form.get("captcha_provider") || "");
  // Single active gate — only when the main form was submitted.
  if (provider) setPref("captcha_provider", provider === "slider" || provider === "off" ? provider : "default");
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

async function setRole(form: FormData) {  "use server";
  const me = await sessionUser();
  if (!me || me.role !== "owner") return;
  const email = String(form.get("email"));
  const role = String(form.get("role"));
  if (!["owner", "manager", "sales", "cashier", "inventory", "accountant", "hr", "marketing", "author", "staff", "member"].includes(role) || email === me.email) return;
  getDb().prepare("UPDATE AppUser SET role=?, designation=? WHERE email=?").run(
    role, String(form.get("designation") || "").slice(0, 60), email);
  getDb().prepare("UPDATE Membership SET role=? WHERE userId=(SELECT id FROM AppUser WHERE email=?)").run(role, email);
  const { audit } = await import("@/lib/scale");
  audit(me.email, "role.change", email, `→ ${role}`);
  revalidatePath("/admin/settings");
}

async function impersonate(form: FormData) {
  "use server";
  const { impersonator, startImpersonation } = await import("@/lib/auth");
  const me = await sessionUser();
  if (!me || me.role !== "owner") return;
  if (await impersonator()) return; // no nested impersonation
  const jar = await cookies();
  const ownerToken = jar.get("cr_session")?.value;
  if (!ownerToken) return;
  try {
    const c = startImpersonation(me.email, ownerToken, String(form.get("email") || ""));
    jar.set("cr_session", c.session, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: c.maxAge });
    jar.set("cr_imp", c.imp, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: c.maxAge });
  } catch {
    return;
  }
  redirect("/admin");
}

async function stopImpersonate() {
  "use server";
  const { impersonator, stopImpersonation } = await import("@/lib/auth");
  const imp = await impersonator();
  if (!imp) return;
  const jar = await cookies();
  const cur = jar.get("cr_session")?.value;
  try {
    stopImpersonation(cur, imp.token);
  } catch {
    return;
  }
  jar.set("cr_session", imp.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86400 });
  jar.delete("cr_imp");
  const { audit } = await import("@/lib/scale");
  audit(imp.email, "impersonate.stop", "", "");
  redirect("/admin/settings");
}

async function saveBusiness(form: FormData) {  "use server";
  await requireTeam();
  for (const k of ["biz_name", "biz_address", "biz_city", "biz_state", "biz_pin", "biz_gstin", "biz_cin", "biz_phone", "biz_email"]) {
    const v = form.get(k);
    if (typeof v === "string") setPref(k, v.slice(0, 300));
  }
  revalidatePath("/admin/settings");
}

async function saveTaxRate(form: FormData) {  "use server";
  await requireTeam();
  const { saveTax } = await import("@/lib/commerce");
  saveTax({
    name: String(form.get("name") || "GST").slice(0, 60),
    pct: Math.max(0, Number(form.get("pct") || 0)),
    inter: form.get("inter") === "on",
    inclusive: form.get("inclusive") !== "off",
  });
  revalidatePath("/admin/settings");
}

async function toggleTaxRate(form: FormData) {  "use server";
  await requireTeam();
  const { listTaxes, saveTax } = await import("@/lib/commerce");
  const id = Number(form.get("id") || 0);
  const row = (listTaxes() as { id: number; active: number }[]).find((x) => x.id === id);
  if (!row) return;
  const { setTaxActive } = await import("@/lib/commerce");
  setTaxActive(id, !row.active);
  revalidatePath("/admin/settings");
}

async function saveFlags(form: FormData) {
  "use server";
  await requireTeam();
  const { SERVICE_FLAGS, setFlag } = await import("@/lib/flags");
  for (const key of Object.keys(SERVICE_FLAGS)) {
    setFlag(key, form.get(`flag_${key}`) === "on");
  }
  revalidatePath("/admin/settings");
}

async function clearPrice(form: FormData) {  "use server";
  await requireTeam();
  const k = String(form.get("key") || "");
  const cur = JSON.parse(getPref("site_prices", "{}") || "{}");
  delete cur[k];
  setPref("site_prices", JSON.stringify(cur));
  revalidatePath("/admin/settings");
}

async function resetQuickbarRole(form: FormData) {  "use server";
  await requireTeam();
  const role = String(form.get("role") || "");
  try {
    const cur = JSON.parse(getPref("quickbar", "{}") || "{}");
    delete cur[role];
    setPref("quickbar", JSON.stringify(cur));
  } catch { /* keep */ }
  redirect("/admin/settings?tab=quickbar");
}

async function saveQuickbar(form: FormData) {
  "use server";
  await requireTeam();
  const ids = new Set<string>(QUICKBAR_ACTIONS.map((a) => a.id));
  const out: Record<string, string[]> = {};
  for (const role of QUICKBAR_ROLES) {
    const picked = form.getAll(`qb_${role}`).map(String).filter((x) => ids.has(x)).slice(0, 5);
    if (picked.length > 0) out[role] = picked;
  }
  setPref("quickbar", JSON.stringify(out));
  redirect("/admin/settings?tab=quickbar&saved=1");
}

async function savePrices(form: FormData) {  "use server";
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

const SETTING_TABS = ["general", "team", "sessions", "business", "tax", "flags", "prices", "quickbar"] as const;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; saved?: string }> }) {
  const sp = await searchParams;
  const raw = sp.tab ?? "general";
  const tab = (SETTING_TABS as readonly string[]).includes(raw) ? raw : "general";
  const saved = sp.saved === "1";
  const me = await sessionUser();
  const isOwner = me?.role === "owner";
  const meEmail = me?.email ?? "";
  const team = getDb().prepare(
    `SELECT u.email, u.role, u.designation, m.role mrole FROM AppUser u LEFT JOIN Membership m ON m.userId=u.id ORDER BY u.id`).all() as
    { email: string; role: string; designation: string; mrole: string | null }[];
  const notifs = getDb().prepare("SELECT COUNT(*) c FROM Notification").get() as { c: number };
  const sessions = getDb().prepare(
    `SELECT s.id, u.email, s.expiresAt FROM Session s JOIN AppUser u ON u.id=s.userId ORDER BY s.id DESC LIMIT 50`).all() as
    { id: number; email: string; expiresAt: string }[];
  let prices: Record<string, number> = {};
  try { prices = JSON.parse(getPref("site_prices", "{}") || "{}"); } catch { /* defaults */ }
  return (
    <>
      <h1 className="text-2xl font-extrabold">Settings & team</h1>
      <SubTabs active={tab} label="Settings sections" tabs={[
        { id: "general", label: "General", Icon: SlidersHorizontal, href: "/admin/settings" },
        { id: "team", label: `Team (${team.length})`, Icon: Users, href: "/admin/settings?tab=team" },
        { id: "sessions", label: `Sessions (${sessions.length})`, Icon: MonitorSmartphone, href: "/admin/settings?tab=sessions" },
        { id: "business", label: "Business", Icon: Store, href: "/admin/settings?tab=business" },
        { id: "tax", label: "Tax", Icon: ReceiptText, href: "/admin/settings?tab=tax" },
        { id: "flags", label: "Flags", Icon: Flag, href: "/admin/settings?tab=flags" },
        { id: "prices", label: "Prices", Icon: IndianRupee, href: "/admin/settings?tab=prices" },
        { id: "quickbar", label: "Quick bar", Icon: Zap, href: "/admin/settings?tab=quickbar" },
      ]} />
      {tab === "general" && (<>
      <form action={save} className="mt-4 grid max-w-xl gap-3 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <label className="flex min-h-[44px] items-center gap-2 text-sm">
          <input type="checkbox" name="daily_report" value="on" defaultChecked={getPref("daily_report", "on") === "on"} className="h-5 w-5" />
          <Mail size={16} className="shrink-0 text-brand-deep" /> Daily owner report email (23:55 IST)
        </label>
        <label className="flex min-h-[44px] items-center gap-2 text-sm">
          <input type="checkbox" name="backup" value="on" defaultChecked={getPref("backup", "on") === "on"} className="h-5 w-5" />
          <DatabaseBackup size={16} className="shrink-0 text-brand-deep" /> Daily database backup (~03:00 IST, keeps 7 verified copies)
        </label>
        <label className="grid gap-1 text-sm"><span className="flex items-center gap-1.5"><Phone size={14} className="text-brand-deep" /> Contact phone (overrides env in reports)</span>
          <input name="contact_phone" inputMode="tel" defaultValue={getPref("contact_phone", "")} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
        <label className="grid gap-1 text-sm"><span className="flex items-center gap-1.5"><AtSign size={14} className="text-brand-deep" /> Contact email</span>
          <input name="contact_email" inputMode="email" defaultValue={getPref("contact_email", "")} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
        <label className="grid gap-1 text-sm"><span className="flex items-center gap-1.5"><Store size={14} className="text-brand-deep" /> Business type (drives staff quick actions)</span>
          <select name="business_type" defaultValue={getPref("business_type", "shop")}
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20">
            {[["shop", "Shop — counter first (POS + PIN flow)"], ["ecommerce", "E-commerce — orders first"], ["clinic", "Clinic/OPD — bookings first (phased)"]].map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
          <label className="grid gap-1 text-sm"><span className="flex items-center gap-1.5"><Timer size={14} className="text-brand-deep" /> SLA: escalate open after (hours)</span>
            <input name="sla_ack_hours" inputMode="numeric" defaultValue={getPref("sla_ack_hours", "24")} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
          <label className="grid gap-1 text-sm"><span className="flex items-center gap-1.5"><Timer size={14} className="text-brand-deep" /> SLA: auto-close resolved after (days)</span>
            <input name="sla_close_days" inputMode="numeric" defaultValue={getPref("sla_close_days", "14")} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
        </div>
        <fieldset className="grid gap-1 text-sm"><span className="flex items-center gap-1.5 font-semibold"><ShieldCheck size={14} className="text-brand-deep" /> Human gate — exactly one active</span>
          {(["default", "slider", "off"] as const).map((p) => (
            <label key={p} className="flex min-h-[44px] items-center gap-2">
              <input type="radio" name="captcha_provider" value={p} defaultChecked={getPref("captcha_provider", "default") === p} className="h-5 w-5" />
              {p === "default" ? (<><Calculator size={15} className="text-brand-deep" /> Math check (classic)</>) : p === "slider" ? (<><Puzzle size={15} className="text-brand-deep" /> Slide puzzle (visual)</>) : (<><Ban size={15} className="text-zinc-400" /> Off (no gate)</>)}
            </label>
          ))}
        </fieldset>
        <button className="min-h-[44px] w-fit rounded-xl bg-brand px-5 text-sm font-semibold text-white">Save</button>
      </form>
      <form action={runReport} className="mt-3">
        <button className="min-h-[44px] rounded-full border border-black/15 px-5 text-sm font-semibold dark:border-white/20">Send report now (to owner emails)</button>
      </form>
      <form action={runInfra} className="mt-2">
        <button className="min-h-[44px] rounded-full border border-black/15 px-5 text-sm font-semibold dark:border-white/20">Run infra check now</button>
      </form>
      </>)}
      {tab === "team" && (<>
      <h2 className="mt-6 font-bold">Team ({team.length})</h2>
      <form action={save} className="mt-2 grid max-w-xl gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <label className="grid gap-1 text-sm">Invite emails (comma-separated — they can sign in as member; assign roles below)
          <input name="team_invites" defaultValue={getPref("team_invites", "")} maxLength={2000}
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
        <button className="min-h-[44px] w-fit rounded-xl bg-brand px-5 text-sm font-semibold text-white">Save invites</button>
      </form>
      <ul className="mt-2 space-y-2 text-sm">
        {team.map((t) => (
          <li key={t.email} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10">
            <span>{t.email} · {t.role}{t.mrole ? ` / ${t.mrole}` : ""}{t.designation ? ` · ${t.designation}` : ""}</span>
            <form action={setRole} className="flex flex-wrap gap-2">
              <input type="hidden" name="email" value={t.email} />
              <input name="designation" defaultValue={t.designation ?? ""} placeholder="Designation" maxLength={60}
                className="min-h-[44px] w-36 rounded-xl border border-black/15 bg-transparent px-2 dark:border-white/20" />
              <select name="role" defaultValue={["owner", "manager", "sales", "cashier", "inventory", "accountant", "hr", "marketing", "author", "staff"].includes(t.role) ? t.role : "member"} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 dark:border-white/20">
                {[["member", "member (legacy)"], ["staff", "staff"], ["author", "author (blog)"], ["sales", "sales"], ["cashier", "cashier"], ["inventory", "inventory"], ["accountant", "accountant"], ["hr", "hr"], ["marketing", "marketing"], ["manager", "manager"], ["owner", "owner"]].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <button className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">Set</button>
            </form>
            {isOwner && t.email !== meEmail && (
              <form action={impersonate}>
                <input type="hidden" name="email" value={t.email} />
                <button className="min-h-[44px] rounded-xl border border-brand/40 px-3 text-sm font-semibold text-brand-deep" title="Log in as this user (audited)">Impersonate</button>
              </form>
            )}
          </li>
        ))}
        {team.length === 0 && <li className="text-zinc-500">Nobody signed in yet — magic links admit owner emails.</li>}
      </ul>
      </>)}
      {tab === "sessions" && (<>
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
      </>)}
      {tab === "business" && (<>
      <h2 className="mt-6 font-bold">Business profile (prints on bills)</h2>
      <form action={saveBusiness} className="mt-2 grid max-w-xl gap-2 rounded-2xl border border-black/10 p-4 md:grid-cols-2 dark:border-white/10">
        {[["biz_name", "Business name"], ["biz_phone", "Phone"], ["biz_email", "Email"], ["biz_address", "Address"], ["biz_city", "City"], ["biz_state", "State"], ["biz_pin", "Pincode"], ["biz_gstin", "GSTIN"], ["biz_cin", "CIN"]].map(([k, l]) => (
          <label key={k} className="grid gap-1 text-sm">{l}
            <input name={k} defaultValue={getPref(k, "")} maxLength={300}
              className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
          </label>
        ))}
        <button className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white md:col-span-2 md:w-fit">Save business</button>
      </form>
      </>)}
      {tab === "tax" && (<>
      <h2 className="mt-6 font-bold">Tax rates (GST-ready: rate table, CGST/SGST vs IGST per bill)</h2>
      <ul className="mt-2 max-w-xl space-y-1 text-sm">
        {(listTaxes() as { id: number; name: string; pct: number; inter: number; inclusive: number; active: number }[]).map((t) => (
          <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
            <span>{t.name} · {t.pct}% · {t.inter ? "IGST" : "CGST+SGST"} · {t.inclusive ? "inclusive" : "exclusive"}</span>
            <form action={toggleTaxRate} className="flex items-center gap-2">
              <input type="hidden" name="id" value={t.id} />
              <span className={t.active ? "text-xs font-bold text-emerald-700" : "text-xs text-zinc-400"}>{t.active ? "applied" : "off"}</span>
              <button aria-label={`Turn ${t.name} ${t.active ? "off" : "on"}`} className="min-h-[44px] min-w-[52px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">{t.active ? "On" : "Off"}</button>
            </form>
          </li>
        ))}
      </ul>
      <form action={saveTaxRate} className="mt-2 flex max-w-xl flex-wrap items-end gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <label className="grid gap-1 text-sm">Name<input name="name" required maxLength={60} placeholder="GST 18%"
          className="min-h-[44px] w-32 rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
        <label className="grid gap-1 text-sm">%<input name="pct" inputMode="decimal" required
          className="min-h-[44px] w-20 rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
        <label className="flex min-h-[44px] items-center gap-2 text-sm">
          <input type="checkbox" name="inter" value="on" className="h-5 w-5" /> Inter-state (IGST)</label>
        <button className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white">Add rate</button>
      </form>
      </>)}
      {tab === "flags" && (<>
      <form action={saveFlags} className="mt-2 grid max-w-xl gap-1 rounded-2xl border border-black/10 p-4 dark:border-white/10">
      <h2 className="font-bold">Chatbot replies</h2>
        {flagStates().filter((f) => f.key.startsWith("share_")).map((f) => (
          <label key={f.key} className="flex min-h-[44px] items-center gap-2 text-sm">
            <input type="checkbox" name={`flag_${f.key}`} value="on" defaultChecked={f.on} className="h-5 w-5" />
            {f.label}
          </label>
        ))}
      <h2 className="mt-4 font-bold">Service flags (storefront kill-switches)</h2>
        {flagStates().filter((f) => !f.key.startsWith("share_")).map((f) => (
          <label key={f.key} className="flex min-h-[44px] items-center gap-2 text-sm">
            <input type="checkbox" name={`flag_${f.key}`} value="on" defaultChecked={f.on} className="h-5 w-5" />
            {f.label}
          </label>
        ))}
        <button className="min-h-[44px] w-fit rounded-xl bg-brand px-5 text-sm font-semibold text-white">Save flags</button>
      </form>
      </>)}
      {tab === "quickbar" && (<>
      {saved && <p role="status" className="mb-2 rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">Quick bar saved ✓ — staff bars update on next focus.</p>}
      <h2 className="font-bold">Staff quick bar <span className="text-xs font-normal text-zinc-500">(mobile floating buttons per role — scan stays central)</span></h2>
      <form action={saveQuickbar} className="mt-2 grid max-w-xl gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        {QUICKBAR_ROLES.map((role) => {
          const cur = (quickbarCustom()[role] ?? []);
          return (
            <fieldset key={role} className="grid gap-1 rounded-xl border border-black/10 p-2 dark:border-white/10">
              <legend className="flex items-center gap-2 px-1 text-sm font-bold capitalize">{role}{cur.length === 0 && <span className="font-normal text-zinc-500"> (defaults)</span>}
                {cur.length > 0 && (
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] text-brand-deep">custom</span>
                )}</legend>
              <div className="flex flex-wrap gap-1.5">
                {QUICKBAR_ACTIONS.map((a) => (
                  <label key={a.id} className="flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-black/15 px-3 text-sm dark:border-white/20">
                    <input type="checkbox" name={`qb_${role}`} value={a.id} defaultChecked={cur.includes(a.id)} className="h-5 w-5" />
                    {a.label}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
        <div className="flex flex-wrap gap-1.5">
          <button className="min-h-[44px] w-fit rounded-xl bg-brand px-5 text-sm font-semibold text-white">Save quick bar</button>
        </div>
        <p className="text-xs text-zinc-500">Reset one role to defaults:</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICKBAR_ROLES.filter((role) => (quickbarCustom()[role] ?? []).length > 0).map((role) => (
            <form key={role} action={resetQuickbarRole}>
              <input type="hidden" name="role" value={role} />
              <button className="min-h-[44px] rounded-full border border-black/15 px-3 text-xs font-semibold capitalize dark:border-white/20">↺ {role}</button>
            </form>
          ))}
        </div>
      </form>
      </>)}
      {tab === "prices" && (<>
      <h2 className="mt-6 font-bold">Site prices (₹ — live on pricing page, calculator, agent)</h2>
      <form action={savePrices} className="mt-2 grid max-w-xl grid-cols-1 gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10 min-[420px]:grid-cols-2 md:grid-cols-3">
        {[["audit", "Audit"], ["packFrom", "Pack from"], ["siteFrom", "Site from"], ["retainerFrom", "Retainer/mo"], ["leadsFrom", "Leads/mo"]].map(([k, l]) => (
          <label key={k} className="grid gap-1 text-sm"><span className="flex items-center gap-1.5">{l}
            {prices[k] !== undefined
              ? <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand-deep">custom</span>
              : <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-zinc-500 dark:bg-white/10">default</span>}
          </span>
            <input name={k} inputMode="numeric" defaultValue={prices[k] ?? ""} placeholder="default"
              className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
          </label>
        ))}
        <button className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white min-[420px]:col-span-2 md:col-span-3 md:w-fit">Save prices</button>
      </form>
      {Object.keys(prices).length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {Object.keys(prices).map((k) => (
            <form key={k} action={clearPrice}>
              <input type="hidden" name="key" value={k} />
              <button className="min-h-[44px] rounded-full border border-black/15 px-3 text-xs dark:border-white/20">↺ {k} to default</button>
            </form>
          ))}
        </div>
      )}
      <p className="mt-2 text-sm text-zinc-500">Broadcasts sent: {notifs.c} · Org: CodeRender (id 1) · preferences stored per key.</p>
      </>)}
    </>
  );
}
