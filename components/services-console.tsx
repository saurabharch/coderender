"use client";

import { StatusBadge } from "@/components/admin-ux";

import { Plus } from "lucide-react"
import { useEffect, useState } from "react";
import { AdminCard, Empty, Skeleton } from "@/components/admin-ui";

interface Job { id: number; no: string; service: string; staff: string; status: string; customer: string; branch: string }
interface Branch { id: number; name: string; active: number }

export function ServicesConsole() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [svc, setSvc] = useState("");
  const [bname, setBname] = useState("");

  async function load() {
    const [j, b] = await Promise.all([
      fetch("/api/services/jobs").then((r) => r.json()).catch(() => null),
      fetch("/api/services/places").then((r) => r.json()).catch(() => null),
    ]);
    if (j?.jobs) setJobs(j.jobs);
    if (b?.branches) setBranches(b.branches);
    setLoaded(true);
  }

  useEffect(() => { void load(); }, []);

  async function book() {
    const res = await fetch("/api/services/jobs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service: svc }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Booked ${d.job?.no} ✓` : (d.error ?? "book failed"));
    if (res.ok) { setSvc(""); void load(); }
  }

  async function advance(id: number, to: string) {
    const res = await fetch("/api/services/jobs", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, to }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `${to} ✓` : (d.error ?? "failed"));
    if (res.ok) void load();
  }

  async function addBranch() {
    const res = await fetch("/api/services/places", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: bname }),
    });
    setMsg(res.ok ? "Branch added ✓" : "failed");
    if (res.ok) { setBname(""); void load(); }
  }

  if (!loaded) return <Skeleton lines={5} />;
  const next: Record<string, string[]> = {
    booked: ["assigned"], assigned: ["in-progress"], "in-progress": ["done"],
  };
  return (
    <div className="grid gap-3">
      <AdminCard>
        <p className="font-bold">Book a job</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={svc} onChange={(e) => setSvc(e.target.value)} placeholder="Service (AC repair, facial…)" maxLength={150}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void book()} disabled={!svc.trim()}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Book</button>
        </div>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Job cards ({jobs.length})</p>
        {jobs.length === 0 ? <div className="mt-2"><Empty>No jobs — book the first above.</Empty></div> : (
          <ul className="mt-2 space-y-1 text-sm">
            {jobs.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span className="flex flex-wrap items-center gap-1.5">{j.no} · {j.service} · {j.customer || "walk-in"} · {j.branch} · <StatusBadge status={j.status} />{j.staff ? ` · ${j.staff}` : ""}</span>
                <span className="flex gap-1">
                  <a href={`/admin/services/${j.id}/print`} className="flex min-h-[44px] items-center rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Print</a>
                  {(next[j.status] ?? []).map((to) => (
                    <button key={to} onClick={() => void advance(j.id, to)}
                      className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">{to}</button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-xs text-zinc-500">Assign staff + invoice from the API (PUT assign/bill) — full desk UI in a later pass.</p>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Branches ({branches.length})</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={bname} onChange={(e) => setBname(e.target.value)} placeholder="Branch name" maxLength={80}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void addBranch()} disabled={!bname.trim()}
            className="flex min-h-[44px] min-w-[52px] items-center justify-center rounded-xl bg-brand px-4 text-white disabled:opacity-40" aria-label="Add"><Plus size={20} /></button>
        </div>
        {branches.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
            {branches.map((b) => <li key={b.id} className="rounded-full border border-black/15 px-3 py-1.5 dark:border-white/20">{b.name}</li>)}
          </ul>
        )}
      </AdminCard>
      {msg && <p className="text-sm text-zinc-500">{msg}</p>}
    </div>
  );
}
