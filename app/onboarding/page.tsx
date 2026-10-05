import { redirect } from "next/navigation";
import { getDb, getPref, setPref } from "@/lib/store";
import { sessionUser } from "@/lib/auth";

const SCALES: Record<string, { label: string; roles: string; blurb: string }> = {
  solo: { label: "Solo / micro", roles: "owner", blurb: "Just you — everything in one login." },
  growing: { label: "Growing", roles: "owner · sales · accountant · marketing · author", blurb: "Sales, money, reach and content covered." },
  multi: { label: "Multi-branch", roles: "owner · manager · cashier · inventory · hr + growing roles", blurb: "Counters, stock, people and branches." },
};

async function saveStep(form: FormData) {
  "use server";
  const done = getPref("onboarded", "") === "1";
  if (done) {
    const { requireTeam } = await import("@/lib/auth");
    await requireTeam();
  }
  const step = String(form.get("step") || "1");
  if (step === "1") {
    for (const k of ["biz_name", "biz_phone", "biz_city"]) {
      const v = form.get(k);
      if (typeof v === "string" && v.trim()) setPref(k, v.slice(0, 300));
    }
  }
  if (step === "2") {
    const mode = String(form.get("site_mode") || "agency");
    if (["agency", "profile", "shop", "booking"].includes(mode)) setPref("site_mode", mode);
    const theme = String(form.get("site_theme") || "amazon");
    if (["amazon", "flipkart", "myntra", "ajio", "cal", "district", "bms", "minimal", "bold"].includes(theme)) setPref("site_theme", theme);
  }
  if (step === "3") {
    const scale = String(form.get("org_scale") || "solo");
    if (SCALES[scale]) setPref("org_scale", scale);
  }
  if (step === "4") {
    const invites = String(form.get("team_invites") || "").split(",")
      .map((s) => s.trim().toLowerCase()).filter((s) => s.includes("@")).slice(0, 50);
    if (invites.length) {
      const cur = getPref("team_invites", "");
      const merged = [...new Set([...cur.split(",").map((s) => s.trim()).filter(Boolean), ...invites])];
      setPref("team_invites", merged.join(", "));
    }
  }
  if (step === "5") {
    setPref("onboarded", "1");
    redirect("/admin");
  }
  redirect(`/onboarding?step=${Number(step) + 1}`);
}

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const sp = await searchParams;
  const done = getPref("onboarded", "") === "1";
  if (done) {
    const me = await sessionUser();
    if (!me) redirect("/login");
  }
  const step = Math.min(5, Math.max(1, Number(sp.step || 1) || 1));
  try {
    getDb().prepare("SELECT 1").get();
  } catch { /* first boot */ }
  const scale = getPref("org_scale", "solo");
  return (
    <div className="wrap section max-w-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Setup · step {step} of 5</p>
      <h1 className="display-1 mt-1">
        {step === 1 && "Your business"}
        {step === 2 && "Your storefront"}
        {step === 3 && "Your scale"}
        {step === 4 && "Your team"}
        {step === 5 && "Ready"}
      </h1>
      <form action={saveStep} className="mt-5 grid gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <input type="hidden" name="step" value={step} />
        {step === 1 && (<>
          <label className="grid gap-1 text-sm">Business name
            <input name="biz_name" required defaultValue={getPref("biz_name", "")} maxLength={300}
              className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
          <label className="grid gap-1 text-sm">Phone
            <input name="biz_phone" defaultValue={getPref("biz_phone", "")} maxLength={300}
              className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
          <label className="grid gap-1 text-sm">City
            <input name="biz_city" defaultValue={getPref("biz_city", "")} maxLength={300}
              className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
        </>)}
        {step === 2 && (<>
          <fieldset className="grid gap-1 text-sm">What should <code>/</code> be?
            {[["agency", "Agency — full growth site (default)"], ["profile", "Business profile card"], ["shop", "Shop storefront (live catalogue)"], ["booking", "Booking app (services + industries)"]].map(([v, l]) => (
              <label key={v} className="flex min-h-[44px] items-center gap-2">
                <input type="radio" name="site_mode" value={v} defaultChecked={getPref("site_mode", "agency") === v} className="h-5 w-5" />{l}
              </label>
            ))}
          </fieldset>
          <fieldset className="grid gap-1 text-sm">Theme
            {[["amazon", "Amazon-like"], ["flipkart", "Flipkart-like"], ["myntra", "Myntra-like"], ["ajio", "Ajio-like"], ["cal", "Cal-like"], ["district", "District-like"], ["bms", "BookMyShow-like"], ["minimal", "Minimal"], ["bold", "Bold"]].map(([v, l]) => (
              <label key={v} className="flex min-h-[44px] items-center gap-2">
                <input type="radio" name="site_theme" value={v} defaultChecked={getPref("site_theme", "amazon") === v} className="h-5 w-5" />{l}
              </label>
            ))}
          </fieldset>
        </>)}
        {step === 3 && (
          <fieldset className="grid gap-2 text-sm">How big is the operation? Roles unlock accordingly.
            {Object.entries(SCALES).map(([v, s]) => (
              <label key={v} className="flex min-h-[44px] cursor-pointer items-start gap-2 rounded-xl border border-black/10 p-3 dark:border-white/10">
                <input type="radio" name="org_scale" value={v} defaultChecked={scale === v} className="mt-1 h-5 w-5" />
                <span><b>{s.label}</b><br /><span className="text-zinc-500">{s.blurb}<br />Roles: {s.roles}</span></span>
              </label>
            ))}
          </fieldset>
        )}
        {step === 4 && (
          <label className="grid gap-1 text-sm">Invite teammates (comma-separated emails — they join as staff, you assign roles)
            <input name="team_invites" defaultValue={getPref("team_invites", "")} maxLength={2000}
              className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
          </label>
        )}
        {step === 5 && (
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Business <b>{getPref("biz_name", "—")}</b> · mode <b>{getPref("site_mode", "agency")}</b> ·
            scale <b>{SCALES[getPref("org_scale", "solo")]?.label}</b> · invites <b>{getPref("team_invites", "none")}</b>.
            Finish to open your dashboard — roles live in Settings → Team.
          </p>
        )}
        <button className="min-h-[44px] w-fit rounded-xl bg-brand px-6 text-sm font-semibold text-white">
          {step === 5 ? "Finish → dashboard" : step === 1 ? "Continue →" : "Save → next"}
        </button>
      </form>
    </div>
  );
}
