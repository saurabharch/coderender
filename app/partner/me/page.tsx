import type { Metadata } from "next";
import { partnerByEmail, partnerStats, listPayouts } from "@/lib/partners";
import { partnerSession } from "@/lib/partner-auth";
import { PartnerLogin } from "@/components/partner-login";
import { PartnerDash } from "@/components/partner-dash";

export const metadata: Metadata = {
  title: "Partner Dashboard — CodeRender",
  description: "Track referrals, goals, milestones, earnings, and payouts.",
};

export default async function PartnerMe() {
  const email = await partnerSession();
  const partner = email ? partnerByEmail(email) : null;
  if (!partner) {
    return (
      <div className="wrap section max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Partners</p>
        <h1 className="display-1 mt-1">Partner sign-in</h1>
        <p className="mt-2 text-sm text-zinc-500">Join with your email (PIN shown once), then track everything below.</p>
        <div className="mt-4"><PartnerLogin onDone={() => {}} /></div>
      </div>
    );
  }
  const stats = partnerStats(partner.id);
  const payouts = listPayouts(partner.id);
  const origin = (process.env.APP_URL || "http://localhost:3100").replace(/\/$/, "");
  return (
    <div className="wrap section max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Partners</p>
      <h1 className="display-1 mt-1">Hi {partner.name || partner.email.split("@")[0]} 👋</h1>
      <div className="mt-3 grid gap-2 rounded-2xl border border-black/10 p-4 text-sm dark:border-white/10 md:grid-cols-3">
        <p><b>Your link</b><br /><code className="break-all text-xs">{origin}/r/{partner.code}</code></p>
        <p><b>Tier</b><br />{partner.tier} · {partner.ratePercent}%</p>
        <p><b>Banking</b><br />{partner.bankVerified ? "✓ verified" : "unverified — add below"}</p>
      </div>
      <div className="mt-4"><PartnerDash email={partner.email} stats={stats} /></div>
      <h2 className="mt-6 font-bold">My payouts</h2>
      <ul className="mt-2 space-y-1 font-mono text-xs">
        {payouts.map((p) => (
          <li key={p.id} className="rounded-xl border border-black/10 p-2 dark:border-white/10">
            #{p.id} {p.period} · ₹{p.amount} · <b>{p.status}</b>
            {p.status === "paid" && <span> · confirm from your payout email to settle</span>}
          </li>
        ))}
        {payouts.length === 0 && <li className="text-zinc-500">No payouts yet.</li>}
      </ul>
    </div>
  );
}
