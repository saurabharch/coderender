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
  const [repmonth, setRepmonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [rep, setRep] = useState<{ headcount: number; byDept: Record<string, number>; payroll: { runs: string[]; lines: number; total: number }; attendance: { id: number; name: string; dept: string; days: number; present: number }[] } | null>(null);
  const [slrun, setSlrun] = useState("");
  const [slemp, setSlemp] = useState("");
  const [slip, setSlip] = useState<{ run: { month: string; status: string }; line: { name: string; designation: string; dept: string; base: number; allowances: number; deductions: number; loanCut: number; net: number }; ytd: { s: number; n: number }; loan: { balance: number; installment: number } | null } | null>(null);
  const [desigs, setDesigs] = useState<{ title: string; grade: string }[]>([]);
  const [cands, setCands] = useState<{ id: number; name: string; designation: string; stage: string }[]>([]);
  const [caname, setCaname] = useState("");
  const [trid, setTrid] = useState("");
  const [trainings, setTrainings] = useState<{ id: number; course: string; onDay: string; status: string }[]>([]);
  const [trcourse, setTrcourse] = useState("");
  const [trday, setTrday] = useState("");
  const [dtitle, setDtitle] = useState("");
  const [offers, setOffers] = useState<{ id: number; name: string; designation: string; ctc: number; joining: string; status: string }[]>([]);
  const [ofname, setOfname] = useState("");
  const [ofctc, setOfctc] = useState("");
  const [lcid, setLcid] = useState("");
  const [timeline, setTimeline] = useState<{ kind: string; detail: string; at: string }[]>([]);
  const [evkind, setEvkind] = useState("note");
  const [evdetail, setEvdetail] = useState("");
  const [exreason, setExreason] = useState("");
  const [exday, setExday] = useState("");
  const [exitinfo, setExitinfo] = useState<{ reason: string; lastDay: string; status: string; clearance: string } | null>(null);
  const [ff, setFf] = useState<{ earnedLeft: number; leaveValue: number; openLoans: number; unpaidExpenses: number } | null>(null);
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

  async function loadCands() {
    const d = await fetch("/api/people/ops?candidates=").then((r) => r.json()).catch(() => null);
    if (d?.candidates) setCands(d.candidates);
  }

  async function addCandidate() {
    if (!caname.trim()) return;
    const res = await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidate: caname.trim() }),
    });
    setMsg(res.ok ? "Candidate added ✓" : "failed");
    if (res.ok) { setCaname(""); void loadCands(); }
  }

  async function moveCand(id: number, to: string) {
    const res = await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candMove: id, to }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? (d.offerId ? `Offer #${d.offerId} created ✓ (hire in Offers)` : `${to} ✓`) : (d.error ?? "failed"));
    if (res.ok) { void loadCands(); void loadMeta(); }
  }

  async function loadTrainings() {
    if (!trid) return;
    const d = await fetch(`/api/people/ops?trainings=${encodeURIComponent(trid)}`).then((r) => r.json()).catch(() => null);
    if (d?.trainings) setTrainings(d.trainings);
  }

  async function logCourse() {
    if (!trid || !trcourse.trim() || !trday) return;
    const res = await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ training: Number(trid), course: trcourse.trim(), day: trday }),
    });
    setMsg(res.ok ? "Training logged ✓" : "failed");
    if (res.ok) { setTrcourse(""); void loadTrainings(); }
  }

  async function loadMeta() {
    const [dg, of] = await Promise.all([
      fetch("/api/people/ops?designations=1").then((r) => r.json()).catch(() => null),
      fetch("/api/people/ops?offers=1").then((r) => r.json()).catch(() => null),
    ]);
    if (dg?.designations) setDesigs(dg.designations);
    if (of?.offers) setOffers(of.offers);
  }

  async function addDesignation() {
    if (!dtitle.trim()) return;
    await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ designation: dtitle.trim() }),
    });
    setDtitle(""); void loadMeta();
  }

  async function makeOffer() {
    if (!ofname.trim()) return;
    const res = await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer: ofname.trim(), ctc: Math.round(Number(ofctc || 0) * 100) }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Offer made ✓" : (d.error ?? "failed"));
    if (res.ok) { setOfname(""); setOfctc(""); void loadMeta(); }
  }

  async function decideOffer(id: number, to: string) {
    const res = await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerTo: to, offerId: id }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? (d.employeeId ? `Hired ✓ employee #${d.employeeId}` : `${to} ✓`) : (d.error ?? "failed"));
    if (res.ok) { void loadMeta(); void load(); }
  }

  async function loadLifecycle() {
    if (!lcid) return;
    const [tl, ex, f] = await Promise.all([
      fetch(`/api/people/ops?timeline=${encodeURIComponent(lcid)}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/people/ops?exit=${encodeURIComponent(lcid)}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/people/ops?fullfinal=${encodeURIComponent(lcid)}`).then((r) => r.json()).catch(() => null),
    ]);
    if (tl?.timeline) setTimeline(tl.timeline);
    setExitinfo(ex?.exit ?? null);
    if (f && typeof f.earnedLeft === "number") setFf(f);
  }

  async function recordEvent() {
    if (!lcid) return;
    await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empEvent: Number(lcid), kind: evkind, detail: evdetail.trim() }),
    });
    setEvdetail(""); void loadLifecycle();
  }

  async function resign() {
    if (!lcid || !exday) return;
    const res = await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resign: Number(lcid), reason: exreason.trim(), lastDay: exday }),
    });
    setMsg(res.ok ? "Resignation filed ✓" : "failed");
    if (res.ok) void loadLifecycle();
  }

  async function toggleClear(key: string, done: boolean) {
    await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: Number(lcid), key, done }),
    });
    void loadLifecycle();
  }

  const [cycles, setCycles] = useState<{ id: number; name: string; period: string; status: string }[]>([]);
  const [cycname, setCycname] = useState("");
  const [cycid, setCycid] = useState("");
  const [cycdetail, setCycdetail] = useState<{ goals: { id: number; employeeId: number; name: string; title: string; weight: number }[]; reviews: { employeeId: number; name: string; rating: number; status: string }[] } | null>(null);
  const [goalemp, setGoalemp] = useState("");
  const [goaltitle, setGoaltitle] = useState("");
  const [revemp, setRevemp] = useState("");
  const [revrate, setRevrate] = useState("4");

  async function loadCycles() {
    const d = await fetch("/api/people/ops?cycles=1").then((r) => r.json()).catch(() => null);
    if (d?.cycles) setCycles(d.cycles);
  }

  async function openCycle() {
    if (!cycid) {
      if (!cycname.trim()) return;
      const res = await fetch("/api/people/ops", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycle: cycname.trim() }),
      });
      const dd = await res.json().catch(() => ({}));
      if (res.ok) { setCycname(""); setCycid(String(dd.id)); void loadCycles(); }
      return;
    }
    const d = await fetch(`/api/people/ops?cycle=${encodeURIComponent(cycid)}`).then((r) => r.json()).catch(() => null);
    if (d) setCycdetail(d);
  }

  async function addGoal() {
    if (!cycid || !goalemp || !goaltitle.trim()) return;
    const res = await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: Number(cycid), employeeId: Number(goalemp), title: goaltitle.trim() }),
    });
    setMsg(res.ok ? "Goal added ✓" : "failed");
    if (res.ok) { setGoaltitle(""); void openCycle(); }
  }

  async function submitRev(complete: boolean) {
    if (!cycid || !revemp) return;
    const res = await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(complete
        ? { reviewDone: Number(cycid), employeeId: Number(revemp) }
        : { review: Number(cycid), employeeId: Number(revemp), rating: Number(revrate) }),
    });
    const dd = await res.json().catch(() => ({}));
    setMsg(res.ok ? (complete ? "Review complete ✓" : "Review submitted ✓") : (dd.error ?? "failed"));
    if (res.ok) void openCycle();
  }

  async function loadReport() {
    const d = await fetch(`/api/people/ops?hrreport=${encodeURIComponent(repmonth)}`).then((r) => r.json()).catch(() => null);
    if (d && typeof d.headcount === "number") setRep(d);
  }

  async function loadSlip() {
    if (!slrun || !slemp) return;
    const d = await fetch(`/api/people/ops?payslip=${encodeURIComponent(slrun)}&emp=${encodeURIComponent(slemp)}`).then((r) => r.json()).catch(() => null);
    if (d?.line) setSlip(d);
    else setMsg("No slip for that run/employee.");
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
    void loadCycles();
    void loadCands();
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

  const [runs, setRuns] = useState<{ id: number; month: string; status: string }[]>([]);
  const [structs, setStructs] = useState<{ id: number; name: string; base: number; allowances: number; deductions: number }[]>([]);
  const [stname, setStname] = useState("");
  const [stbase, setStbase] = useState("");
  const [stallow, setStallow] = useState("");
  const [stemp, setStemp] = useState("");

  function Exceptions({ runId }: { runId: number }) {
    const [ex, setEx] = useState<{ level: string; text: string }[] | null>(null);
    useEffect(() => {
      fetch(`/api/people/ops?exceptions=${runId}`).then((r) => r.json()).then((d) => {
        if (d?.exceptions?.length) setEx(d.exceptions);
      }).catch(() => {});
    }, [runId]);
    if (!ex) return null;
    return (
      <span className="flex flex-wrap gap-1">
        {ex.map((x, i) => (
          <span key={i} className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${x.level === "block" ? "bg-red-500/15 text-red-700" : "bg-amber-500/15 text-amber-700"}`}>
            {x.level === "block" ? "✕ " : "⚠ "}{x.text}
          </span>
        ))}
      </span>
    );
  }

  async function loadRuns() {
    const [r, s] = await Promise.all([
      fetch("/api/people/ops?runs=1").then((x) => x.json()).catch(() => null),
      fetch("/api/people/ops?structures=1").then((x) => x.json()).catch(() => null),
    ]);
    if (r?.runs) setRuns(r.runs);
    if (s?.structures) setStructs(s.structures);
  }

  async function runPayroll() {
    const step = async (body: Record<string, unknown>) => {
      const r = await fetch("/api/people/ops", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      return { ok: r.ok, d: await r.json().catch(() => ({})) };
    };
    const opened = await step({ month });
    if (!opened.ok) { setMsg(opened.d.error ?? "failed"); return; }
    const id = opened.d.id;
    for (const to of ["reviewed", "approved", "locked"]) {
      const s = await step({ runstate: id, to });
      if (!s.ok) { setMsg(`Stuck at ${to}: ${s.d.error ?? "failed"}`); void loadRuns(); return; }
    }
    const pay = await step({ pay: id });
    setMsg(pay.ok ? `Paid ${pay.d.paid} staff ₹${(pay.d.total / 100).toFixed(0)} ✓ (reviewed → approved → locked → paid)` : (pay.d.error ?? "pay failed"));
    void loadRuns();
  }

  async function advanceRun(id: number, to: string) {
    const res = await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runstate: id, to }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `${to} ✓` : (d.error ?? "failed"));
    if (res.ok) void loadRuns();
  }

  async function saveStruct() {
    if (!stname.trim() || !stbase) return;
    const res = await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ structure: stname.trim(), base: Math.round(Number(stbase) * 100), allowances: Math.round(Number(stallow || 0) * 100), deductions: 0 }),
    });
    setMsg(res.ok ? "Structure saved ✓" : "failed");
    if (res.ok) { setStname(""); setStbase(""); setStallow(""); void loadRuns(); }
  }

  async function applyStruct(id: number) {
    if (!stemp) { setMsg("Enter emp id to apply to."); return; }
    const res = await fetch("/api/people/ops", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applyStruct: id, employeeId: Number(stemp) }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Applied to employee ✓" : (d.error ?? "failed"));
    if (res.ok) void load();
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
        <p className="font-bold">Hiring pipeline <span className="text-xs font-normal text-zinc-500">(applied → hired; offer auto-created)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={caname} onChange={(e) => setCaname(e.target.value)} placeholder="Candidate name" maxLength={120}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void addCandidate()} disabled={!caname.trim()}
            className="flex min-h-[44px] min-w-[52px] items-center justify-center rounded-xl bg-brand px-4 text-white disabled:opacity-40" aria-label="Add candidate"><Plus size={20} /></button>
        </div>
        {cands.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {cands.slice(0, 10).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span>{c.name} {c.designation ? <span className="text-xs text-zinc-500">· {c.designation}</span> : null} · <StatusBadge status={c.stage} /></span>
                {c.stage !== "hired" && c.stage !== "declined" && (
                  <span className="flex gap-1">
                    <button onClick={() => void moveCand(c.id, c.stage === "applied" ? "screening" : c.stage === "screening" ? "interview" : c.stage === "interview" ? "offered" : "hired")}
                      className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Advance →</button>
                    <button onClick={() => void moveCand(c.id, "declined")}
                      className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">Decline</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Training</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={trid} onChange={(e) => setTrid(maskInt(e.target.value))} placeholder="Emp id" inputMode="numeric"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={trcourse} onChange={(e) => setTrcourse(e.target.value)} placeholder="Course (GST filing)" maxLength={120}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input type="date" value={trday} onChange={(e) => setTrday(e.target.value)} aria-label="Training date"
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void logCourse()} disabled={!trid || !trcourse.trim() || !trday}
            className="flex min-h-[44px] min-w-[52px] items-center justify-center rounded-xl bg-brand px-4 text-white disabled:opacity-40" aria-label="Log training"><Plus size={20} /></button>
          <button onClick={() => void loadTrainings()} disabled={!trid}
            className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20 disabled:opacity-40">View</button>
        </div>
        {trainings.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {trainings.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span>{x.course} · {x.onDay} · <StatusBadge status={x.status === "done" ? "done" : "booked"} /></span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Designations ({desigs.length})</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={dtitle} onChange={(e) => setDtitle(e.target.value)} placeholder="Senior Cashier" maxLength={80}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void addDesignation()} disabled={!dtitle.trim()}
            className="flex min-h-[44px] min-w-[52px] items-center justify-center rounded-xl bg-brand px-4 text-white disabled:opacity-40" aria-label="Add designation"><Plus size={20} /></button>
        </div>
        {desigs.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
            {desigs.map((d) => <li key={d.title} className="rounded-full border border-black/15 px-3 py-1.5 dark:border-white/20">{d.title}</li>)}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Offers ({offers.filter((o) => o.status === "offered").length} open)</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={ofname} onChange={(e) => setOfname(e.target.value)} placeholder="Candidate name" maxLength={120}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={ofctc} onChange={(e) => setOfctc(maskAmount(e.target.value))} placeholder="Annual CTC ₹" inputMode="decimal"
            className="min-h-[44px] w-32 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void makeOffer()} disabled={!ofname.trim()}
            className="flex min-h-[44px] min-w-[52px] items-center justify-center rounded-xl bg-brand px-4 text-white disabled:opacity-40" aria-label="Make offer"><Plus size={20} /></button>
        </div>
        {offers.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {offers.slice(0, 8).map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span>{o.name} · ₹{(o.ctc / 100).toFixed(0)}/yr · <StatusBadge status={o.status} /></span>
                {o.status === "offered" && (
                  <span className="flex gap-1">
                    <button onClick={() => void decideOffer(o.id, "accepted")} className="min-h-[44px] rounded-xl bg-brand px-3 text-xs font-bold text-white">Hire</button>
                    <button onClick={() => void decideOffer(o.id, "declined")} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">Decline</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Lifecycle & exit <span className="text-xs font-normal text-zinc-500">(timeline, clearance, dues)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={lcid} onChange={(e) => setLcid(maskInt(e.target.value))} placeholder="Emp id" inputMode="numeric"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void loadLifecycle()} disabled={!lcid}
            className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20 disabled:opacity-40">Open</button>
          {ff && <span className="flex items-center gap-1.5 text-xs text-zinc-500">earned leave {ff.earnedLeft}d (₹{(ff.leaveValue / 100).toFixed(0)}) · loans ₹{(ff.openLoans / 100).toFixed(0)} · unpaid expenses ₹{(ff.unpaidExpenses / 100).toFixed(0)}</span>}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <select value={evkind} onChange={(e) => setEvkind(e.target.value)} aria-label="Event kind"
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
            {["promotion", "transfer", "probation", "confirmed", "note"].map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input value={evdetail} onChange={(e) => setEvdetail(e.target.value)} placeholder="Detail (new dept, grade…)" maxLength={300}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void recordEvent()} disabled={!lcid}
            className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20 disabled:opacity-40">Log</button>
        </div>
        {timeline.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {timeline.map((x, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span><b className="capitalize">{x.kind}</b> · {x.detail}</span>
                <span className="text-xs text-zinc-500">{x.at.slice(0, 16).replace("T", " ")}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-1.5 flex flex-wrap items-end gap-1.5">
          <input value={exreason} onChange={(e) => setExreason(e.target.value)} placeholder="Exit reason" maxLength={200}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input type="date" value={exday} onChange={(e) => setExday(e.target.value)} aria-label="Last day"
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void resign()} disabled={!lcid || !exday}
            className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20 disabled:opacity-40">Resign</button>
        </div>
        {exitinfo && (
          <div className="mt-1.5 rounded-xl border border-black/10 p-2 dark:border-white/10">
            <p className="text-sm">Exit: {exitinfo.status} · last day {exitinfo.lastDay} · {exitinfo.reason}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {["accounts", "devices", "dues", "handover"].map((k) => {
                let done = false;
                try { done = !!(JSON.parse(exitinfo.clearance || "{}") as Record<string, boolean>)[k]; } catch { /* ignore */ }
                return (
                  <button key={k} onClick={() => void toggleClear(k, !done)} aria-pressed={done}
                    className={`min-h-[44px] rounded-xl border px-3 text-xs font-semibold ${done ? "border-brand bg-brand/10 text-brand-deep" : "border-black/15 dark:border-white/20"}`}>{done ? "✓ " : ""}{k}</button>
                );
              })}
              {exitinfo.status === "resigned" && (
                <button onClick={async () => {
                  const res = await fetch("/api/people/ops", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ closeExit: Number(lcid) }),
                  });
                  setMsg(res.ok ? "Exited ✓ deactivated" : "failed");
                  if (res.ok) { void loadLifecycle(); void load(); }
                }} className="min-h-[44px] rounded-xl bg-brand px-4 text-xs font-bold text-white">Close exit</button>
              )}
            </div>
          </div>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Reports <span className="text-xs font-normal text-zinc-500">(registers)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={repmonth} onChange={(e) => setRepmonth(e.target.value)} placeholder="YYYY-MM" maxLength={7}
            className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-3 font-mono text-sm dark:border-white/20" />
          <button onClick={() => void loadReport()}
            className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Load registers</button>
        </div>
        {rep && (
          <div className="mt-2 grid gap-2 text-sm">
            <p>Headcount <b>{rep.headcount}</b> · {Object.entries(rep.byDept).map(([k, v]) => `${k} ${v}`).join(" · ")}</p>
            <p>Payroll: {rep.payroll.runs.length > 0 ? rep.payroll.runs.join(", ") : "no run"} · {rep.payroll.lines} lines · <b>₹{(rep.payroll.total / 100).toFixed(0)}</b></p>
            <ul className="space-y-1">
              {rep.attendance.map((a) => (
                <li key={a.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                  <span>{a.name} <span className="text-xs text-zinc-500">{a.dept || ""}</span></span>
                  <span className="text-xs">{a.present}/{a.days} days</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Payslip</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <select value={slrun} onChange={(e) => setSlrun(e.target.value)} aria-label="Payroll run"
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
            <option value="">Run…</option>
            {runs.map((r) => <option key={r.id} value={r.id}>{r.month} ({r.status})</option>)}
          </select>
          <input value={slemp} onChange={(e) => setSlemp(maskInt(e.target.value))} placeholder="Emp id" inputMode="numeric"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void loadSlip()} disabled={!slrun || !slemp}
            className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20 disabled:opacity-40">View</button>
        </div>
        {slip && (
          <div id="hr-payslip" className="mx-auto mt-2 max-w-sm rounded-2xl border border-black/10 bg-white p-4 text-sm text-black">
            <style>{`@media print {
              @page { margin: 0; }
              body { background: #fff !important; }
              body * { visibility: hidden; }
              #hr-payslip, #hr-payslip * { visibility: visible; }
              #hr-payslip { position: absolute; inset: 0 auto auto 0; width: 72mm; border: none; margin: 0; }
              nav[aria-label="Admin"] { display: none !important; }
            }`}</style>
            <p className="text-center text-base font-extrabold">Payslip · {slip.run.month}</p>
            <p className="text-center text-xs text-zinc-600">{slip.line.name} · {slip.line.designation || ""} · {slip.line.dept || ""}</p>
            <hr className="my-2 border-dashed border-black/20" />
            <div className="space-y-0.5 font-mono text-xs">
              <p className="flex justify-between"><span>Base</span><span>₹{(slip.line.base / 100).toFixed(0)}</span></p>
              <p className="flex justify-between"><span>Allowances</span><span>₹{(slip.line.allowances / 100).toFixed(0)}</span></p>
              <p className="flex justify-between"><span>Deductions</span><span>−₹{(slip.line.deductions / 100).toFixed(0)}</span></p>
              {slip.line.loanCut > 0 && <p className="flex justify-between"><span>Loan slice</span><span>−₹{(slip.line.loanCut / 100).toFixed(0)}</span></p>}
              <p className="flex justify-between text-base font-extrabold"><span>Net</span><span>₹{(slip.line.net / 100).toFixed(0)}</span></p>
              <p className="flex justify-between text-zinc-600"><span>YTD ({slip.run.month.slice(0, 4)})</span><span>₹{(slip.ytd.s / 100).toFixed(0)} · {slip.ytd.n} runs</span></p>
              {slip.loan && <p className="flex justify-between text-zinc-600"><span>Loan balance</span><span>₹{(slip.loan.balance / 100).toFixed(0)}</span></p>}
            </div>
            <button onClick={() => window.print()} className="mt-3 min-h-[48px] w-full rounded-xl bg-black text-sm font-bold text-white print:hidden">Print slip</button>
          </div>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Performance <span className="text-xs font-normal text-zinc-500">(cycles, goals, reviews)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <select value={cycid} onChange={(e) => { setCycid(e.target.value); setCycdetail(null); }} aria-label="Review cycle"
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
            <option value="">Cycle…</option>
            {cycles.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.status})</option>)}
          </select>
          <input value={cycname} onChange={(e) => setCycname(e.target.value)} placeholder="New cycle (Q4)" maxLength={120}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void openCycle()}
            className="flex min-h-[44px] min-w-[52px] items-center justify-center rounded-xl bg-brand px-4 text-white" aria-label="Open or create cycle"><Plus size={20} /></button>
        </div>
        {cycid && (
          <div className="mt-2 grid gap-1.5">
            <div className="flex flex-wrap gap-1.5">
              <input value={goalemp} onChange={(e) => setGoalemp(maskInt(e.target.value))} placeholder="Emp id" inputMode="numeric"
                className="min-h-[44px] w-20 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
              <input value={goaltitle} onChange={(e) => setGoaltitle(e.target.value)} placeholder="Goal (close 20 tickets)" maxLength={200}
                className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
              <button onClick={() => void addGoal()} disabled={!goalemp || !goaltitle.trim()}
                className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20 disabled:opacity-40">Goal</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <input value={revemp} onChange={(e) => setRevemp(maskInt(e.target.value))} placeholder="Emp id" inputMode="numeric"
                className="min-h-[44px] w-20 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
              <select value={revrate} onChange={(e) => setRevrate(e.target.value)} aria-label="Rating"
                className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
                {["5", "4", "3", "2", "1"].map((r) => <option key={r} value={r}>{r}★</option>)}
              </select>
              <button onClick={() => void submitRev(false)} disabled={!revemp}
                className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20 disabled:opacity-40">Submit</button>
              <button onClick={() => void submitRev(true)} disabled={!revemp}
                className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-bold text-white disabled:opacity-40">Complete</button>
            </div>
            {cycdetail && (
              <ul className="space-y-1 text-sm">
                {cycdetail.goals.map((g) => (
                  <li key={g.id} className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                    🎯 {g.name || `#${g.employeeId}`} · {g.title}
                  </li>
                ))}
                {cycdetail.reviews.map((r, i) => (
                  <li key={`r${i}`} className="flex flex-wrap items-center gap-1.5 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                    <span>{"★".repeat(r.rating)}</span>
                    <StatusBadge status={r.status === "complete" ? "done" : r.status === "submitted" ? "sent" : "draft"} />
                    <span className="text-xs text-zinc-500">{r.name || `#${r.employeeId}`}</span>
                  </li>
                ))}
                {cycdetail.goals.length === 0 && cycdetail.reviews.length === 0 && <li className="text-zinc-500">Empty cycle — add the first goal.</li>}
              </ul>
            )}
          </div>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Payroll <span className="text-xs font-normal text-zinc-500">(review → approve → lock → pay)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={month} onChange={(e) => setMonth(maskYearMonth(e.target.value))} placeholder="YYYY-MM" maxLength={7}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void runPayroll()}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white">Open + Pay</button>
        </div>
        {runs.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {runs.slice(0, 6).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span>{r.month} · <StatusBadge status={r.status} /></span>
                <Exceptions runId={r.id} />
                <span className="flex gap-1">
                  {r.status === "draft" && <button onClick={() => void advanceRun(r.id, "reviewed")} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Review</button>}
                  {r.status === "reviewed" && <button onClick={() => void advanceRun(r.id, "approved")} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Approve</button>}
                  {r.status === "approved" && <button onClick={() => void advanceRun(r.id, "locked")} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Lock</button>}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 font-bold">Salary structures</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <input value={stname} onChange={(e) => setStname(e.target.value)} placeholder="Name (Trainee)" maxLength={80}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={stbase} onChange={(e) => setStbase(maskAmount(e.target.value))} placeholder="Base ₹/mo" inputMode="decimal"
            className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={stallow} onChange={(e) => setStallow(maskAmount(e.target.value))} placeholder="Allow ₹" inputMode="decimal"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={stemp} onChange={(e) => setStemp(maskInt(e.target.value))} placeholder="Emp id" inputMode="numeric"
            className="min-h-[44px] w-20 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void saveStruct()} disabled={!stname.trim() || !stbase}
            className="flex min-h-[44px] min-w-[52px] items-center justify-center rounded-xl bg-brand px-4 text-white disabled:opacity-40" aria-label="Save structure"><Plus size={20} /></button>
        </div>
        {structs.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
            {structs.map((s) => (
              <li key={s.id} className="flex items-center gap-1.5 rounded-full border border-black/15 py-1.5 pl-3 pr-1.5 dark:border-white/20">
                {s.name} ₹{(s.base / 100).toFixed(0)}
                <button onClick={() => void applyStruct(s.id)} title="Apply to emp id above"
                  className="min-h-[36px] rounded-full bg-brand/10 px-3 text-xs font-bold text-brand-deep">Apply</button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-xs text-zinc-500">Builds lines (base + allowances − deductions − loan slice), pays from Cash, posts to ledger. Attendance, leave and timesheets live on the API.</p>
      </AdminCard>
      {msg && <p className="text-sm text-zinc-500">{msg}</p>}
    </div>
  );
}
