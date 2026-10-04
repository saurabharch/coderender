import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getDb, getPref, setPref } from "@/lib/store";
import { requireTeam } from "@/lib/auth";
import { approvePayout, createPartner, listPartners, listPayouts, markPaid, partnerStats, payoutDigest, setBanking } from "@/lib/partners";
import { ledgerBalances } from "@/lib/finance";

async function setStatus(form: FormData) {
  "use server";
  await requireTeam();
  const s = String(form.get("status"));
  if (!["new", "approved", "rejected", "paid"].includes(s)) return;
  getDb().prepare("UPDATE PartnerRequest SET status=? WHERE id=?").run(s, Number(form.get("id")));
  revalidatePath("/admin/partners");
}

async function addPartner(form: FormData) {
  "use server";
  await requireTeam();
  try {
    createPartner({ email: String(form.get("email") || ""), name: String(form.get("name") || ""), tier: String(form.get("tier") || "referrer") });
  } catch { /* bad email ignored */ }
  revalidatePath("/admin/partners");
}

async function verifyBank(form: FormData) {
  "use server";
  await requireTeam();
  setBanking(Number(form.get("id")), {}, String(form.get("verified")) === "1");
  revalidatePath("/admin/partners");
}

async function doApprove(form: FormData) {
  "use server";
  await requireTeam();
  try { approvePayout(Number(form.get("id")), "admin"); } catch { /* bad state */ }
  revalidatePath("/admin/partners");
}

async function doPay(form: FormData) {
  "use server";
  await requireTeam();
  try { markPaid(Number(form.get("id")), "admin", String(form.get("method") || "")); } catch { /* bad state */ }
  revalidatePath("/admin/partners");
}

async function savePrefs(form: FormData) {
  "use server";
  await requireTeam();
  const min = Math.max(0, Math.round(Number(form.get("min") || 0)));
  if (min > 0) setPref("partner_min_payout", String(min));
  revalidatePath("/admin/partners");
}

async function addOffer(form: FormData) {
  "use server";
  await requireTeam();
  const code = String(form.get("code") || "").toUpperCase().replace(/[^A-Z0-9-]+/g, "").slice(0, 20);
  if (!code) return;
  getDb().prepare("INSERT INTO Offer (title, code, kind, value) VALUES (?,?,?,?) ON CONFLICT(code) DO NOTHING").run(
    String(form.get("title") || code).slice(0, 120), code,
    String(form.get("kind") || "percent"), Math.max(0, Number(form.get("value") || 0)));
  revalidatePath("/admin/partners");
}

export default async function PartnersPage() {
  const reqs = getDb().prepare("SELECT * FROM PartnerRequest ORDER BY id DESC LIMIT 50").all() as
    { id: number; name: string; phone: string; city: string; tier: string; status: string }[];
  const partners = listPartners();
  const payouts = listPayouts();
  const digest = payoutDigest();
  const bal = ledgerBalances();
  const offers = getDb().prepare("SELECT * FROM Offer ORDER BY id DESC LIMIT 50").all() as
    { id: number; title: string; code: string; kind: string; value: number; active: number }[];
  return (
    <>
      <h1 className="text-2xl font-extrabold">Partners, payouts & books</h1>
      <p className="mt-1 font-mono text-xs">
        ledger: {bal.map((b) => `${b.account} ₹${b.balance}`).join(" · ") || "empty"}
      </p>

      <h2 className="mt-6 font-bold">Daily digest ({digest.length})</h2>
      <ul className="mt-2 space-y-1 font-mono text-xs">
        {digest.map((d, i) => <li key={i} className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2">{d}</li>)}
        {digest.length === 0 && <li className="text-zinc-500">Nothing due — no eligible payouts, no unverified banking, no fresh milestones.</li>}
      </ul>

      <h2 className="mt-6 font-bold">Partners ({partners.length})</h2>
      <form action={addPartner} className="mt-2 flex flex-wrap gap-2">
        <input name="email" type="email" required placeholder="partner email" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <input name="name" placeholder="name" maxLength={80} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <select name="tier" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
          <option value="referrer">referrer 10%</option><option value="reseller">reseller 20%</option><option value="city">city 30%</option>
        </select>
        <button className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white">Add + mint link</button>
      </form>
      <ul className="mt-2 space-y-2 text-sm">
        {partners.map((p) => {
          const s = partnerStats(p.id);
          return (
            <li key={p.id} className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
              <p><b>{p.name || p.email}</b> · {p.tier} {p.ratePercent}% · <code className="text-xs">/r/{p.code}</code></p>
              <p className="mt-1 font-mono text-xs text-zinc-500">
                leads {s.leads} · paid {s.paid} · revenue ₹{s.revenue} · earnings ₹{s.commission} ·
                bank {p.bankVerified ? "✓ verified" : "✗ unverified"} {p.upi || p.accountNo || ""}
              </p>
              <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10" title="month progress">
                <span className="bg-brand" style={{ width: `${Math.min(100, Math.round(s.month.revenue / 100000) * 100)}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {s.milestones.filter((m) => m.at).map((m) => (
                  <span key={m.code} className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">🏆 {m.name}</span>
                ))}
              </div>
              <form action={verifyBank} className="mt-2 flex gap-1">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="verified" value={p.bankVerified ? "0" : "1"} />
                <button className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">
                  {p.bankVerified ? "Unverify banking" : "Verify banking"}
                </button>
              </form>
            </li>
          );
        })}
      </ul>

      <h2 className="mt-6 font-bold">Payouts ({payouts.length})</h2>
      <p className="mt-1 text-xs text-zinc-500">Flow: requested → approved → paid → <b>settled only after partner confirmation</b>. Revenue counts settled only. Next unlocks after the minimal goal in a closed period.</p>
      <ul className="mt-2 space-y-1 font-mono text-xs">
        {payouts.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-black/10 p-2 dark:border-white/10">
            <span>#{p.id} partner #{p.partnerId} {p.period} · ₹{p.amount} · <b>{p.status}</b> · {p.method || "—"}</span>
            <span className="ml-auto flex gap-1">
              {p.status === "requested" && (
                <form action={doApprove}><input type="hidden" name="id" value={p.id} />
                  <button className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">Approve</button></form>
              )}
              {p.status === "approved" && (
                <form action={doPay} className="flex gap-1"><input type="hidden" name="id" value={p.id} />
                  <input name="method" placeholder="upi:… / txn id" maxLength={60} className="min-h-[44px] w-32 rounded-xl border border-black/15 bg-transparent px-2 dark:border-white/20" />
                  <button className="min-h-[44px] rounded-xl bg-brand px-3 font-semibold text-white">Mark paid</button></form>
              )}
              {p.status === "paid" && <Link href={`/api/partner/confirm/${p.confirmToken}`} className="min-h-[44px] rounded-xl border border-amber-500/50 px-3 py-2.5">awaiting partner confirm</Link>}
            </span>
          </li>
        ))}
        {payouts.length === 0 && <li className="text-zinc-500">No payouts yet.</li>}
      </ul>

      <h2 className="mt-6 font-bold">Offers (referral discounts)</h2>
      <form action={addOffer} className="mt-2 flex flex-wrap gap-2">
        <input name="title" required placeholder="title" maxLength={120} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <input name="code" required placeholder="CODE" maxLength={20} className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <select name="kind" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
          <option value="percent">% off</option><option value="amount">₹ off</option>
        </select>
        <input name="value" inputMode="numeric" placeholder="value" className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <button className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white">Add offer</button>
      </form>
      <ul className="mt-2 space-y-1 font-mono text-xs">
        {offers.map((o) => <li key={o.id} className="rounded-xl border border-black/10 p-2 dark:border-white/10"><b>{o.code}</b> {o.title} · {o.kind === "percent" ? `${o.value}%` : `₹${o.value}`} · {o.active ? "live" : "off"}</li>)}
      </ul>

      <h2 className="mt-6 font-bold">Requests ({reqs.length})</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {reqs.map((r) => (
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
      </ul>

      <form action={savePrefs} className="mt-6 flex flex-wrap items-end gap-2 rounded-2xl border border-black/10 p-4 text-sm dark:border-white/10">
        <label className="grid gap-1">Min payout ₹<input name="min" inputMode="numeric" defaultValue={getPref("partner_min_payout", "1000")} className="min-h-[44px] w-32 rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
        <button className="min-h-[44px] rounded-xl bg-brand px-5 font-semibold text-white">Save</button>
      </form>
    </>
  );
}
