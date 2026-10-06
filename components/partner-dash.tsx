"use client";

import { useState } from "react";
import { partnerStats } from "@/lib/partners";

export function PartnerDash({ email, stats }: {
  email: string;
  stats: ReturnType<typeof partnerStats>;
}) {
  const [goalKind, setGoalKind] = useState("month");
  const [goalPeriod, setGoalPeriod] = useState("clients");
  const [goalTarget, setGoalTarget] = useState("");
  const [bank, setBank] = useState({ bankName: "", accountNo: "", ifsc: "", upi: "" });
  const [reqPeriod, setReqPeriod] = useState("");
  const [msg, setMsg] = useState("");

  async function post(path: string, body: Record<string, unknown>) {
    const res = await fetch(path, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Saved ✓" : (data?.error || "Failed"));
    if (res.ok) setTimeout(() => window.location.reload(), 600);
  }

  return (
    <div className="grid gap-4">
      <section className="grid gap-2 rounded-2xl border border-black/10 p-4 text-sm dark:border-white/10 sm:grid-cols-4">
        <div><p className="text-xs uppercase tracking-wider text-zinc-500">Referrals</p><p className="text-2xl font-extrabold">{stats.leads}</p></div>
        <div><p className="text-xs uppercase tracking-wider text-zinc-500">Paying</p><p className="text-2xl font-extrabold">{stats.paid}</p></div>
        <div><p className="text-xs uppercase tracking-wider text-zinc-500">Client revenue</p><p className="text-2xl font-extrabold">₹{stats.revenue.toLocaleString("en-IN")}</p></div>
        <div><p className="text-xs uppercase tracking-wider text-zinc-500">My earnings</p><p className="text-2xl font-extrabold text-brand-deep">₹{stats.commission.toLocaleString("en-IN")}</p></div>
      </section>

      <section className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <p className="font-bold">Goals (day / week / month / year)</p>
        <ul className="mt-2 space-y-2 text-sm">
          {stats.goals.map((g) => (
            <li key={`${g.kind}-${g.period}`}>
              <span className="flex justify-between text-xs"><b className="capitalize">{g.kind} · {g.period}</b><span>target {g.target} · {g.pct}%</span></span>
              <span className="mt-0.5 block h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <span className="block h-full rounded-full bg-brand" style={{ width: `${g.pct}%` }} />
              </span>
            </li>
          ))}
          {stats.goals.length === 0 && <li className="text-sm text-zinc-500">No goals yet — set your first below.</li>}
        </ul>
        <div className="mt-2 flex flex-wrap gap-1">
          <select value={goalKind} onChange={(e) => setGoalKind(e.target.value)} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
            {["day", "week", "month", "year"].map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={goalPeriod} onChange={(e) => setGoalPeriod(e.target.value)} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
            <option value="clients">clients</option><option value="revenue">revenue ₹</option>
          </select>
          <input value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} inputMode="numeric" placeholder="Target" className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void post("/api/partner/goal", { kind: goalKind, period: goalPeriod, target: Number(goalTarget) })}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white">Set goal</button>
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <p className="font-bold">Milestones</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {stats.milestones.map((m) => (
            <span key={m.code} title={m.at ? `hit ${m.at.slice(0, 10)}` : "locked"}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${m.at ? "bg-brand text-white" : "bg-black/10 text-zinc-500 dark:bg-white/10"}`}>
              {m.at ? "🏆 " : "🔒 "}{m.name}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="font-bold">Request payout</p>
          <p className="mt-1 text-xs text-zinc-500">Closed periods only, above the minimum goal. Next unlocks after this one settles.</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <input value={reqPeriod} onChange={(e) => setReqPeriod(e.target.value)} placeholder="YYYY-MM (e.g. last month)" maxLength={7}
              className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
            <button onClick={() => void post("/api/partner/payout", { period: reqPeriod })}
              className="min-h-[44px] shrink-0 rounded-xl bg-brand px-4 text-sm font-semibold text-white">Request</button>
          </div>
          {msg && <p className="mt-1 text-xs text-zinc-500">{msg}</p>}
        </div>
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="font-bold">Banking / UPI <span className="text-xs font-normal text-zinc-500">(verified by admin)</span></p>
          <div className="mt-2 grid gap-1">
            {(["bankName", "accountNo", "ifsc", "upi"] as const).map((k) => (
              <input key={k} value={bank[k]} onChange={(e) => setBank((b) => ({ ...b, [k]: e.target.value }))} placeholder={k}
                maxLength={80} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
            ))}
            <button onClick={() => void post("/api/partner/banking", bank)}
              className="min-h-[44px] w-fit rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Save details</button>
          </div>
        </div>
      </section>
    </div>
  );
}
