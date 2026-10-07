"use client";

import { AvatarInitials, IconBtn, StatusBadge } from "@/components/admin-ux";
import { maskAmount, maskInt } from "@/lib/mask";

import { maskYearMonth } from "@/lib/mask";

import { Plus } from "lucide-react"
import { useEffect, useState } from "react";
import { AdminCard, Empty, Skeleton } from "@/components/admin-ui";
import { NoSsr } from "@/components/no-ssr";
import { DatePickerInput } from "@mantine/dates";

interface Emp { id: number; name: string; dept: string; designation: string; active?: number }

export function PeopleConsole() {
  const [emps, setEmps] = useState<Emp[]>([]);
  const [presence, setPresence] = useState<{ employeeId: number; name: string; inAt: string; outAt: string }[]>([]);
  const [pioid, setPioid] = useState("");
  const [hols, setHols] = useState<{ day: string; name: string }[]>([]);
  const [hday, setHday] = useState("");
  const [hname, setHname] = useState("");
  const [balid, setBalid] = useState("");
  const [bals, setBals] = useState<{ kind: string; quota: number; taken: number; left: number }[]>([]);
  const [shifts, setShifts] = useState<{ id: number; name: string; start: string; end: string }[]>([]);
  const [shname, setShname] = useState("");
  const [rosterDay, setRosterDay] = useState(() => {
    const d = new Date();
    const back = (d.getDay() + 6) % 7;
    return new Date(d.getTime() - back * 86400_000).toISOString().slice(0, 10);
  });
  const [roster, setRoster] = useState<{ days: string[]; map: Record<string, number> }>({ days: [], map: {} });
  const [obid, setObid] = useState("");
  const [obitems, setObitems] = useState<{ item: string; done: boolean }[]>([]);
  const [exps, setExps] = useState<{ id: number; employeeId: number; name: string; head: string; amount: number; status: string }[]>([]);
  const [exid, setExid] = useState("");
  const [exhead, setExhead] = useState("");
  const [examt, setExamt] = useState("");
  const [otid, setOtid] = useState("");
  const [ot, setOt] = useState<{ logged: number; rostered: number; overtime: number } | null>(null);
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

  async function loadExpenses() {
    const d = await fetch("/api/people/ops?expenses=").then((r) => r.json()).catch(() => null);
    if (d?.expenses) setExps(d.expenses);
  }

  async function fileClaim() {
    if (!exid || !examt) return;
    const res = await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expense: Number(exid), head: exhead.trim() || "Expense", amount: Math.round(Number(examt) * 100) }),
    });
    setMsg(res.ok ? "Claim filed ✓ (submit for approval)" : "failed");
    if (res.ok) { setExid(""); setExhead(""); setExamt(""); void loadExpenses(); }
  }

  async function moveExpense(id: number, to: string) {
    const res = await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expenseTo: to, expenseId: id }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `${to} ✓` : (d.error ?? "failed"));
    if (res.ok) void loadExpenses();
  }

  async function showOvertime() {
    if (!otid) return;
    const d = await fetch(`/api/people/ops?overtime=${encodeURIComponent(otid)}`).then((r) => r.json()).catch(() => null);
    if (d && typeof d.overtime === "number") setOt(d);
  }

  async function load() {
    const [d, l, pr, h] = await Promise.all([
      fetch("/api/people/employees").then((r) => r.json()).catch(() => null),
      fetch("/api/people/ops?leaves=pending").then((r) => r.json()).catch(() => null),
      fetch("/api/people/ops?presence=1").then((r) => r.json()).catch(() => null),
      fetch("/api/people/ops?holidays=1").then((r) => r.json()).catch(() => null),
    ]);
    if (d?.employees) setEmps(d.employees);
    if (l?.leaves) setLeaves(l.leaves);
    if (pr?.presence) setPresence(pr.presence);
    if (h?.holidays) setHols(h.holidays);
    const sh = await fetch("/api/people/ops?shifts=1").then((r) => r.json()).catch(() => null);
    if (sh?.shifts) setShifts(sh.shifts);
    setLoaded(true);
  }

  async function punch(kind: "checkin" | "checkout") {
    if (!pioid) return;
    const res = await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [kind]: Number(pioid) }),
    });
    const dd = await res.json().catch(() => ({}));
    setMsg(res.ok ? `${kind === "checkin" ? "Checked in" : "Checked out"} ✓` : (dd.error ?? "failed"));
    if (res.ok) { setPioid(""); void load(); }
  }

  async function showBalances() {
    if (!balid) return;
    const d = await fetch(`/api/people/ops?balances=${encodeURIComponent(balid)}`).then((r) => r.json()).catch(() => null);
    if (d?.balances) setBals(d.balances);
  }

  async function loadRoster(day: string) {
    const d = await fetch(`/api/people/ops?roster=${encodeURIComponent(day)}`).then((r) => r.json()).catch(() => null);
    if (d?.days) setRoster({ days: d.days, map: d.map });
  }

  async function setShift(empId: number, day: string, shiftId: number) {
    await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roster: empId, day, shift: shiftId }),
    });
    void loadRoster(rosterDay);
  }

  async function addShift() {
    if (!shname.trim()) return;
    const res = await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shift: shname.trim() }),
    });
    setMsg(res.ok ? "Shift saved ✓" : "failed");
    if (res.ok) { setShname(""); void load(); }
  }

  async function loadOnboard() {
    if (!obid) return;
    const d = await fetch(`/api/people/ops?onboard=${encodeURIComponent(obid)}`).then((r) => r.json()).catch(() => null);
    if (d?.items) setObitems(d.items);
  }

  async function toggleOnboard(item: string) {
    await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboard: Number(obid), item }),
    });
    void loadOnboard();
  }

  async function addHoliday() {
    if (!hday || !hname.trim()) return;
    const res = await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holiday: hday, name: hname.trim() }),
    });
    setMsg(res.ok ? "Holiday saved ✓" : "failed");
    if (res.ok) { setHday(""); setHname(""); void load(); }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { void loadRoster(rosterDay); }, [rosterDay]);

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
        <p className="font-bold">Today — presence ({presence.length})</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={pioid} onChange={(e) => setPioid(maskInt(e.target.value))} placeholder="Emp id" inputMode="numeric"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void punch("checkin")}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white">Check in</button>
          <button onClick={() => void punch("checkout")}
            className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Check out</button>
        </div>
        {presence.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {presence.map((x, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span className="flex items-center gap-2"><AvatarInitials name={x.name || "?"} size="sm" />{x.name || `#${x.employeeId}`}</span>
                <span className="text-xs text-zinc-500">{x.inAt.slice(11, 16) || "—"} → {x.outAt.slice(11, 16) || "open"}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Holidays ({hols.length})</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input type="date" value={hday} onChange={(e) => setHday(e.target.value)} aria-label="Holiday date"
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={hname} onChange={(e) => setHname(e.target.value)} placeholder="Diwali" maxLength={120}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void addHoliday()} disabled={!hday || !hname.trim()}
            className="flex min-h-[44px] min-w-[52px] items-center justify-center rounded-xl bg-brand px-4 text-white disabled:opacity-40" aria-label="Add holiday"><Plus size={20} /></button>
        </div>
        {hols.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
            {hols.map((h) => <li key={h.day} className="rounded-full border border-black/15 px-3 py-1.5 dark:border-white/20">{h.day.slice(5)} · {h.name}</li>)}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Leave requests ({leaves.length} pending)</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={balid} onChange={(e) => setBalid(maskInt(e.target.value))} placeholder="Emp id → balances" inputMode="numeric"
            className="min-h-[44px] w-36 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void showBalances()} disabled={!balid}
            className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20 disabled:opacity-40">Balances</button>
          {bals.length > 0 && (
            <span className="flex flex-wrap items-center gap-1.5 text-xs">
              {bals.map((b) => <span key={b.kind} className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">{b.kind}: {b.left}/{b.quota}</span>)}
            </span>
          )}
        </div>
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
        <p className="font-bold">Shifts & roster <span className="text-xs font-normal text-zinc-500">(tap a day, set shifts)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={shname} onChange={(e) => setShname(e.target.value)} placeholder="Shift name (Evening)" maxLength={60}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void addShift()} disabled={!shname.trim()}
            className="flex min-h-[44px] min-w-[52px] items-center justify-center rounded-xl bg-brand px-4 text-white disabled:opacity-40" aria-label="Add shift"><Plus size={20} /></button>
        </div>
        <div className="mt-2 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Roster week">
          {roster.days.map((d) => (
            <button key={d} role="tab" aria-selected={d === rosterDay} onClick={() => setRosterDay(d)}
              className={`min-h-[44px] min-w-[52px] shrink-0 rounded-xl border text-xs font-bold ${d === rosterDay ? "border-brand bg-brand/10 text-brand-deep" : "border-black/15 dark:border-white/20"}`}>
              {d.slice(5)}<br />{["M", "T", "W", "T", "F", "S", "S"][new Date(`${d}T00:00:00Z`).getUTCDay() === 0 ? 6 : new Date(`${d}T00:00:00Z`).getUTCDay() - 1]}
            </button>
          ))}
        </div>
        <ul className="mt-2 space-y-1 text-sm">
          {emps.filter((e) => e.active !== 0).map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
              <span className="flex min-w-0 items-center gap-2"><AvatarInitials name={e.name} size="sm" /><span className="truncate">{e.name}</span></span>
              <select value={roster.map[`${e.id}:${rosterDay}`] ?? 0}
                onChange={(ev) => void setShift(e.id, rosterDay, Number(ev.target.value))}
                aria-label={`Shift for ${e.name} on ${rosterDay}`}
                className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
                <option value={0}>Off</option>
                {shifts.map((s) => <option key={s.id} value={s.id}>{s.name} {s.start}-{s.end}</option>)}
              </select>
            </li>
          ))}
          {emps.length === 0 && <li className="text-zinc-500">No staff yet.</li>}
        </ul>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Onboarding <span className="text-xs font-normal text-zinc-500">(first-week checklist)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={obid} onChange={(e) => setObid(maskInt(e.target.value))} placeholder="Emp id" inputMode="numeric"
            className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void loadOnboard()} disabled={!obid}
            className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20 disabled:opacity-40">Checklist</button>
          {obitems.length > 0 && (
            <span className="text-xs text-zinc-500">{obitems.filter((x) => x.done).length}/{obitems.length} done</span>
          )}
        </div>
        {obitems.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {obitems.map((x) => (
              <li key={x.item}>
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-black/10 px-3 dark:border-white/10">
                  <input type="checkbox" checked={x.done} onChange={() => void toggleOnboard(x.item)} className="h-5 w-5" />
                  <span className={x.done ? "text-zinc-400 line-through" : ""}>{x.item}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Expenses ({exps.filter((x) => x.status === "submitted").length} awaiting approval)</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={exid} onChange={(e) => setExid(maskInt(e.target.value))} placeholder="Emp id" inputMode="numeric"
            className="min-h-[44px] w-20 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={exhead} onChange={(e) => setExhead(e.target.value)} placeholder="Head (fuel…)" maxLength={120}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={examt} onChange={(e) => setExamt(maskAmount(e.target.value))} placeholder="₹" inputMode="decimal"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void fileClaim()} disabled={!exid || !examt}
            className="flex min-h-[44px] min-w-[52px] items-center justify-center rounded-xl bg-brand px-4 text-white disabled:opacity-40" aria-label="File expense"><Plus size={20} /></button>
        </div>
        {exps.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {exps.slice(0, 10).map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span>#{x.employeeId} {x.name || ""} · {x.head} · ₹{(x.amount / 100).toFixed(0)} · <StatusBadge status={x.status} /></span>
                <span className="flex gap-1">
                  {x.status === "draft" && <button onClick={() => void moveExpense(x.id, "submitted")} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Submit</button>}
                  {x.status === "submitted" && (
                    <>
                      <button onClick={() => void moveExpense(x.id, "approved")} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Approve</button>
                      <button onClick={() => void moveExpense(x.id, "rejected")} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">Reject</button>
                    </>
                  )}
                  {x.status === "approved" && <button onClick={() => void moveExpense(x.id, "paid")} className="min-h-[44px] rounded-xl bg-brand px-3 text-xs font-bold text-white">Pay</button>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Overtime <span className="text-xs font-normal text-zinc-500">(logged vs rostered, this week)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={otid} onChange={(e) => setOtid(maskInt(e.target.value))} placeholder="Emp id" inputMode="numeric"
            className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void showOvertime()} disabled={!otid}
            className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20 disabled:opacity-40">Check</button>
          {ot && <span className="flex items-center gap-1.5 text-sm">logged <b>{ot.logged}h</b> · rostered <b>{ot.rostered}h</b> · <b className={ot.overtime > 0 ? "text-amber-600" : ""}>{ot.overtime}h OT</b></span>}
        </div>
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
