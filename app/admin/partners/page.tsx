import { revalidatePath } from "next/cache";
import { getDb, getPref, setPref } from "@/lib/store";
import { requireTeam } from "@/lib/auth";

const DEFAULT_PLAN = [
  { tier: "referrer", commission: 10, note: "per closed deal" },
  { tier: "reseller", commission: 20, note: "city sales" },
  { tier: "city partner", commission: 30, note: "district ownership" },
];

async function setStatus(form: FormData) {
  "use server";
  await requireTeam();
  const s = String(form.get("status"));
  if (!["new", "approved", "rejected", "paid"].includes(s)) return;
  getDb().prepare("UPDATE PartnerRequest SET status=? WHERE id=?").run(s, Number(form.get("id")));
  revalidatePath("/admin/partners");
}

async function savePlan(form: FormData) {
  "use server";
  await requireTeam();
  try {
    const plan = JSON.parse(String(form.get("plan") || "[]"));
    if (!Array.isArray(plan)) return;
    setPref("partner_plan", JSON.stringify(plan));
  } catch { /* invalid json ignored */ }
  revalidatePath("/admin/partners");
}

export default async function PartnersPage() {
  const rows = getDb().prepare("SELECT * FROM PartnerRequest ORDER BY id DESC LIMIT 100").all() as
    { id: number; name: string; phone: string; city: string; tier: string; status: string; createdAt: string }[];
  const planRaw = getPref("partner_plan", "");
  const plan = planRaw ? JSON.parse(planRaw) : DEFAULT_PLAN;
  const paid = (getDb().prepare("SELECT COALESCE(SUM(amount),0) s FROM Payment WHERE status='paid'").get() as { s: number }).s;
  return (
    <>
      <h1 className="text-2xl font-extrabold">Partners & revenue</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Real collected revenue (paid): <b>₹{paid}</b> ·
        at plan rates that means {plan.map((t: { tier: string; commission: number }) => `${t.tier} ₹${Math.round(paid * t.commission / 100)}`).join(" · ")}
      </p>
      <h2 className="mt-6 font-bold">Profit-share plan (JSON editable)</h2>
      <form action={savePlan} className="mt-2 grid gap-2">
        <textarea name="plan" rows={5} defaultValue={JSON.stringify(plan, null, 2)} className="rounded-xl border border-black/15 bg-transparent px-3 py-2 font-mono text-xs dark:border-white/20" />
        <button className="min-h-[44px] w-fit rounded-xl bg-brand px-5 text-sm font-semibold text-white">Save plan</button>
      </form>
      <h2 className="mt-6 font-bold">Requests ({rows.length})</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10">
            <span>#{r.id} {r.name} · {r.phone} · {r.city || "—"} · {r.tier} · <b>{r.status}</b></span>
            <form action={setStatus} className="flex gap-2">
              <input type="hidden" name="id" value={r.id} />
              <select name="status" defaultValue={r.status} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 dark:border-white/20">
                {["new", "approved", "rejected", "paid"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">Set</button>
            </form>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-zinc-500">No partner requests yet.</li>}
      </ul>
    </>
  );
}
