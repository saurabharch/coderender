"use client";

import { AvatarInitials, IconBtn } from "@/components/admin-ux";
import { maskInt } from "@/lib/mask";

import { maskYearMonth } from "@/lib/mask";

import { Plus } from "lucide-react"
import { useEffect, useState } from "react";
import { AdminCard, Empty, Skeleton } from "@/components/admin-ui";
import { NoSsr } from "@/components/no-ssr";
import { DatePickerInput } from "@mantine/dates";

interface Emp { id: number; name: string; dept: string; designation: string }

export function PeopleConsole() {
  const [emps, setEmps] = useState<Emp[]>([]);
  const [leaves, setLeaves] = useState<{ id: number; name: string; fromDay: string; toDay: string; kind: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [base, setBase] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [lvid, setLvid] = useState("");
  const [lfrom, setLfrom] = useState<Date | null>(null);
  const [lto, setLto] = useState<Date | null>(null);
  const asDate = (v: unknown): Date | null =>
    Array.isArray(v) ? ((v[0] as Date | undefined) ?? null) : ((v as Date | null) ?? null);

  async function load() {
    const [d, l] = await Promise.all([
      fetch("/api/people/employees").then((r) => r.json()).catch(() => null),
      fetch("/api/people/ops?leaves=pending").then((r) => r.json()).catch(() => null),
    ]);
    if (d?.employees) setEmps(d.employees);
    if (l?.leaves) setLeaves(l.leaves);
    setLoaded(true);
  }

  useEffect(() => { void load(); }, []);

  async function add() {
    const res = await fetch("/api/people/employees", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, base: Math.round(Number(base) * 100) }),
    });
    setMsg(res.ok ? "Employee added ✓" : "failed");
    if (res.ok) { setName(""); setBase(""); void load(); }
  }

  async function fileLeave() {
    if (!lvid || !lfrom || !lto) return;
    const dayStr = (d: Date) => d.toISOString().slice(0, 10);
    const res = await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leave: Number(lvid), fromDay: dayStr(lfrom), toDay: dayStr(lto) }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Leave filed ✓" : (d.error ?? "failed"));
    if (res.ok) { setLvid(""); setLfrom(null); setLto(null); void load(); }
  }

  async function decideLeave(id: number, to: string) {
    const res = await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approve: id, to }),
    });
    setMsg(res.ok ? `${to} ✓` : "failed");
    if (res.ok) void load();
  }

  async function runPayroll() {
    const res = await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(d.error ?? "failed"); return; }
    const pay = await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pay: d.id }),
    });
    const p = await pay.json().catch(() => ({}));
    setMsg(pay.ok ? `Paid ${p.paid} staff ₹${(p.total / 100).toFixed(0)} ✓` : (p.error ?? "pay failed"));
  }

  if (!loaded) return <Skeleton lines={4} />;
  return (
    <div className="grid gap-3">
      <AdminCard>
        <p className="font-bold">Add employee</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={120}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={base} onChange={(e) => setBase(e.target.value)} placeholder="Monthly ₹" inputMode="decimal"
            className="min-h-[44px] w-32 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <IconBtn label="Add" onClick={() => void add()} disabled={!name.trim() || !base} tone="brand"><Plus size={20} /></IconBtn>
        </div>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Team ({emps.length})</p>
        {emps.length === 0 ? <div className="mt-2"><Empty>Nobody here yet.</Empty></div> : (
          <ul className="mt-2 space-y-1 text-sm">
            {emps.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span className="flex min-w-0 items-center gap-2"><AvatarInitials name={e.name} size="sm" /><span className="truncate">#{e.id} {e.name} {e.designation && <span className="text-xs text-zinc-500">{e.designation}</span>}</span></span>
                <span className="text-xs text-zinc-500">{e.dept || "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Leave requests ({leaves.length} pending)</p>
        <div className="mt-2 flex flex-wrap items-end gap-1.5">
          <input value={lvid} onChange={(e) => setLvid(maskInt(e.target.value))} placeholder="Emp id" inputMode="numeric"
            className="min-h-[44px] w-20 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <NoSsr fallback={<p className="text-sm text-zinc-500">Loading date pickers…</p>}>
          <DatePickerInput value={lfrom} onChange={(v) => setLfrom(asDate(v))} label="From" valueFormat="YYYY-MM-DD"
            className="w-36" styles={{ input: { minHeight: 44, borderRadius: 12 } }} />
          <DatePickerInput value={lto} onChange={(v) => setLto(asDate(v))} label="To" valueFormat="YYYY-MM-DD"
            className="w-36" styles={{ input: { minHeight: 44, borderRadius: 12 } }} />
            <button onClick={() => void fileLeave()} disabled={!lvid || !lfrom || !lto}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">File</button>
          </NoSsr>
        </div>
        {leaves.length === 0 ? <div className="mt-2"><Empty>Nothing pending.</Empty></div> : (
          <ul className="mt-2 space-y-1 text-sm">
            {leaves.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span>{l.name} · {l.fromDay} → {l.toDay} · {l.kind}</span>
                <span className="flex gap-1">
                  <button onClick={() => void decideLeave(l.id, "approved")} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Approve</button>
                  <button onClick={() => void decideLeave(l.id, "rejected")} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Reject</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Payroll</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={month} onChange={(e) => setMonth(maskYearMonth(e.target.value))} placeholder="YYYY-MM" maxLength={7}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void runPayroll()}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white">Open + Pay</button>
        </div>
        <p className="mt-1 text-xs text-zinc-500">Builds lines (base + allowances − deductions − loan slice), pays from Cash, posts to ledger. Attendance, leave and timesheets live on the API.</p>
      </AdminCard>
      {msg && <p className="text-sm text-zinc-500">{msg}</p>}
    </div>
  );
}
