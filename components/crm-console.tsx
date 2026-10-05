"use client";

import { useEffect, useState } from "react";
import { AdminCard, Empty, Skeleton } from "@/components/admin-ui";

interface Attn { level: string; text: string; href: string }
interface Review { id: number; rating: number; title: string; body: string; status: string; product: string; customer: string }

const LVL: Record<string, string> = {
  red: "border-red-500/50", amber: "border-amber-500/50",
  yellow: "border-yellow-500/50", green: "border-emerald-500/40",
};

export function CrmConsole() {
  const [attn, setAttn] = useState<Attn[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [cid, setCid] = useState("");

  async function load() {
    const [a, r] = await Promise.all([
      fetch("/api/crm/engage?view=attention").then((x) => x.json()).catch(() => null),
      fetch("/api/crm/engage").then((x) => x.json()).catch(() => null),
    ]);
    if (a?.attention) setAttn(a.attention);
    if (r?.reviews) setReviews(r.reviews);
    setLoaded(true);
  }

  useEffect(() => { void load(); }, []);

  async function moderate(id: number, to: string) {
    const res = await fetch("/api/crm/engage", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, to }),
    });
    setMsg(res.ok ? `${to} ✓` : "failed");
    if (res.ok) void load();
  }

  async function profile() {
    const d = await fetch(`/api/crm/customers?id=${encodeURIComponent(cid)}`).then((r) => r.json()).catch(() => null);
    setMsg(d?.error ?? `segment ${d.segment} · spend ₹${(d.spend / 100).toFixed(0)} · ${d.orders} orders · ${d.loyalty.points} pts (${d.loyalty.tier}) · ${d.timeline.length} events`);
  }

  if (!loaded) return <Skeleton lines={5} />;
  return (
    <div className="grid gap-3">
      <AdminCard>
        <p className="font-bold">Attention required</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          {attn.map((a, i) => (
            <li key={i} className={`rounded-xl border px-3 py-2 ${LVL[a.level] ?? ""}`}>
              <a href={a.href} className="underline">{a.text} →</a>
            </li>
          ))}
        </ul>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Customer lookup <span className="text-xs font-normal text-zinc-500">(id → segment, CLV, loyalty, timeline)</span></p>
        <div className="mt-2 flex gap-1.5">
          <input value={cid} onChange={(e) => setCid(e.target.value)} placeholder="Customer id" inputMode="numeric"
            className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void profile()} disabled={!cid}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Lookup</button>
        </div>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Reviews ({reviews.length})</p>
        {reviews.length === 0 ? <div className="mt-2"><Empty>No reviews yet.</Empty></div> : (
          <ul className="mt-2 space-y-1 text-sm">
            {reviews.slice(0, 12).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span className="min-w-0">{"★".repeat(r.rating)} {r.title || r.body.slice(0, 60)} <span className="text-xs text-zinc-500">{r.product || ""} · {r.status}</span></span>
                {r.status === "pending" && (
                  <span className="flex gap-1">
                    <button onClick={() => void moderate(r.id, "approved")} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Approve</button>
                    <button onClick={() => void moderate(r.id, "spam")} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Spam</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      {msg && <p className="break-words text-sm text-zinc-500">{msg}</p>}
    </div>
  );
}
