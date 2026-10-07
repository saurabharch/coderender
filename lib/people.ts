// People + planning: employees, payroll + loans, attendance/leave/timesheets,
// budgets, forecasts. Payroll posts to banking + ledger — one book as always.
import { getDb } from "./store";
import { attendanceSummary, forecastNext, loanCut, marginPct, netPay } from "./people-core";

export function peopleTables(): void {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS Employee (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', dept TEXT NOT NULL DEFAULT '', designation TEXT NOT NULL DEFAULT '', base INTEGER NOT NULL DEFAULT 0, allowances INTEGER NOT NULL DEFAULT 0, deductions INTEGER NOT NULL DEFAULT 0, joinedAt TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1)`);
  db.exec(`CREATE TABLE IF NOT EXISTS EmpLoan (id INTEGER PRIMARY KEY AUTOINCREMENT, employeeId INTEGER NOT NULL, amount INTEGER NOT NULL DEFAULT 0, balance INTEGER NOT NULL DEFAULT 0, installment INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'open', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS PayrollRun (id INTEGER PRIMARY KEY AUTOINCREMENT, month TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'draft', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS SalaryStructure (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, base INTEGER NOT NULL DEFAULT 0, allowances INTEGER NOT NULL DEFAULT 0, deductions INTEGER NOT NULL DEFAULT 0)`);
  db.exec(`CREATE TABLE IF NOT EXISTS PayrollLine (id INTEGER PRIMARY KEY AUTOINCREMENT, runId INTEGER NOT NULL, employeeId INTEGER NOT NULL, base INTEGER NOT NULL DEFAULT 0, allowances INTEGER NOT NULL DEFAULT 0, deductions INTEGER NOT NULL DEFAULT 0, loanCut INTEGER NOT NULL DEFAULT 0, net INTEGER NOT NULL DEFAULT 0)`);
  db.exec(`CREATE TABLE IF NOT EXISTS Attendance (employeeId INTEGER NOT NULL, day TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'present', PRIMARY KEY (employeeId, day))`);
  db.exec(`CREATE TABLE IF NOT EXISTS LeaveReq (id INTEGER PRIMARY KEY AUTOINCREMENT, employeeId INTEGER NOT NULL, fromDay TEXT NOT NULL DEFAULT '', toDay TEXT NOT NULL DEFAULT '', kind TEXT NOT NULL DEFAULT 'casual', status TEXT NOT NULL DEFAULT 'pending', notes TEXT NOT NULL DEFAULT '')`);
  db.exec(`CREATE TABLE IF NOT EXISTS Timesheet (id INTEGER PRIMARY KEY AUTOINCREMENT, employeeId INTEGER NOT NULL, day TEXT NOT NULL DEFAULT '', hours REAL NOT NULL DEFAULT 0, taskRef TEXT NOT NULL DEFAULT '')`);
  db.exec(`CREATE TABLE IF NOT EXISTS AttnLog (id INTEGER PRIMARY KEY AUTOINCREMENT, employeeId INTEGER NOT NULL, day TEXT NOT NULL DEFAULT '', inAt TEXT NOT NULL DEFAULT '', outAt TEXT NOT NULL DEFAULT '')`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_attnlog_empday ON AttnLog(employeeId, day)`);
  db.exec(`CREATE TABLE IF NOT EXISTS LeaveType (kind TEXT PRIMARY KEY, quota INTEGER NOT NULL DEFAULT 12)`);
  if ((db.prepare("SELECT COUNT(*) c FROM LeaveType").get() as { c: number }).c === 0) {
    const ins = db.prepare("INSERT INTO LeaveType (kind, quota) VALUES (?,?)");
    ins.run("casual", 12); ins.run("sick", 12); ins.run("earned", 15);
  }
  db.exec(`CREATE TABLE IF NOT EXISTS Holiday (day TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '')`);
  db.exec(`CREATE TABLE IF NOT EXISTS PerfCycle (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, period TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'open', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS PerfGoal (id INTEGER PRIMARY KEY AUTOINCREMENT, cycleId INTEGER NOT NULL, employeeId INTEGER NOT NULL, title TEXT NOT NULL DEFAULT '', weight INTEGER NOT NULL DEFAULT 1)`);
  db.exec(`CREATE TABLE IF NOT EXISTS PerfReview (id INTEGER PRIMARY KEY AUTOINCREMENT, cycleId INTEGER NOT NULL, employeeId INTEGER NOT NULL, rating INTEGER NOT NULL DEFAULT 0, notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft', UNIQUE(cycleId, employeeId))`);
  db.exec(`CREATE TABLE IF NOT EXISTS Candidate (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', designation TEXT NOT NULL DEFAULT '', stage TEXT NOT NULL DEFAULT 'applied', notes TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS Training (id INTEGER PRIMARY KEY AUTOINCREMENT, employeeId INTEGER NOT NULL, course TEXT NOT NULL DEFAULT '', onDay TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'planned')`);
  db.exec(`CREATE TABLE IF NOT EXISTS Designation (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL UNIQUE, grade TEXT NOT NULL DEFAULT '', minPay INTEGER NOT NULL DEFAULT 0, maxPay INTEGER NOT NULL DEFAULT 0)`);
  db.exec(`CREATE TABLE IF NOT EXISTS JobOffer (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', designation TEXT NOT NULL DEFAULT '', ctc INTEGER NOT NULL DEFAULT 0, joining TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'offered', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS EmpEvent (id INTEGER PRIMARY KEY AUTOINCREMENT, employeeId INTEGER NOT NULL, kind TEXT NOT NULL DEFAULT '', detail TEXT NOT NULL DEFAULT '', at TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS ExitCase (employeeId INTEGER PRIMARY KEY, reason TEXT NOT NULL DEFAULT '', lastDay TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'resigned', clearance TEXT NOT NULL DEFAULT '{}')`);
  db.exec(`CREATE TABLE IF NOT EXISTS HrExpense (id INTEGER PRIMARY KEY AUTOINCREMENT, employeeId INTEGER NOT NULL, head TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS Shift (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, start TEXT NOT NULL DEFAULT '09:00', end TEXT NOT NULL DEFAULT '18:00')`);
  if ((db.prepare("SELECT COUNT(*) c FROM Shift").get() as { c: number }).c === 0) {
    const ins = db.prepare("INSERT INTO Shift (name, start, end) VALUES (?,?,?)");
    ins.run("Morning", "09:00", "18:00"); ins.run("Evening", "14:00", "22:00"); ins.run("Night", "22:00", "06:00");
  }
  db.exec(`CREATE TABLE IF NOT EXISTS Roster (employeeId INTEGER NOT NULL, day TEXT NOT NULL, shiftId INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (employeeId, day))`);
  db.exec(`CREATE TABLE IF NOT EXISTS OnboardCheck (employeeId INTEGER NOT NULL, item TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (employeeId, item))`);
  db.exec(`CREATE TABLE IF NOT EXISTS Budget (id INTEGER PRIMARY KEY AUTOINCREMENT, head TEXT NOT NULL, month TEXT NOT NULL DEFAULT '', planned INTEGER NOT NULL DEFAULT 0)`);
}

// ---- employees ----
export function listEmployees(activeOnly = false) {
  peopleTables();
  return getDb().prepare(`SELECT * FROM Employee ${activeOnly ? "WHERE active=1" : ""} ORDER BY name`).all();
}

export function saveEmployee(input: { id?: number; name: string; email?: string; phone?: string; dept?: string; designation?: string; base?: number; allowances?: number; deductions?: number; joinedAt?: string; active?: boolean }): number {
  peopleTables();
  const db = getDb();
  if (input.id) {
    db.prepare(`UPDATE Employee SET name=?, email=?, phone=?, dept=?, designation=?, base=?, allowances=?, deductions=?, joinedAt=?, active=? WHERE id=?`)
      .run(input.name.slice(0, 120), (input.email ?? "").slice(0, 120), (input.phone ?? "").slice(0, 20),
        (input.dept ?? "").slice(0, 60), (input.designation ?? "").slice(0, 60),
        Math.max(0, Math.round(input.base ?? 0)), Math.max(0, Math.round(input.allowances ?? 0)), Math.max(0, Math.round(input.deductions ?? 0)),
        (input.joinedAt ?? "").slice(0, 10), input.active === false ? 0 : 1, input.id);
    return input.id;
  }
  return Number(db.prepare(`INSERT INTO Employee (name, email, phone, dept, designation, base, allowances, deductions, joinedAt) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(input.name.slice(0, 120), (input.email ?? "").slice(0, 120), (input.phone ?? "").slice(0, 20),
      (input.dept ?? "").slice(0, 60), (input.designation ?? "").slice(0, 60),
      Math.max(0, Math.round(input.base ?? 0)), Math.max(0, Math.round(input.allowances ?? 0)), Math.max(0, Math.round(input.deductions ?? 0)),
      (input.joinedAt ?? "").slice(0, 10)).lastInsertRowid);
}

// ---- loans ----
export function giveLoan(employeeId: number, amount: number, installment: number): number {
  peopleTables();
  if (amount <= 0 || installment <= 0) throw new Error("bad loan");
  return Number(getDb().prepare("INSERT INTO EmpLoan (employeeId, amount, balance, installment) VALUES (?,?,?,?)")
    .run(employeeId, Math.round(amount), Math.round(amount), Math.round(installment)).lastInsertRowid);
}

export function openLoans(employeeId: number) {
  peopleTables();
  return getDb().prepare("SELECT * FROM EmpLoan WHERE employeeId=? AND status='open'").all(employeeId);
}

// ---- payroll ----
export function openRun(month: string): number {
  peopleTables();
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("month like YYYY-MM");
  const db = getDb();
  const ex = db.prepare("SELECT id, status FROM PayrollRun WHERE month=?").get(month) as { id: number; status: string } | undefined;
  if (ex) {
    if (ex.status === "paid") throw new Error("run already paid");
    return ex.id;
  }
  const id = Number(db.prepare("INSERT INTO PayrollRun (month) VALUES (?)").run(month).lastInsertRowid);
  for (const e of db.prepare("SELECT * FROM Employee WHERE active=1").all() as
    { id: number; base: number; allowances: number; deductions: number }[]) {
    const loans = db.prepare("SELECT id, balance, installment FROM EmpLoan WHERE employeeId=? AND status='open'").all(e.id) as
      { id: number; balance: number; installment: number }[];
    const cut = loans.reduce((s, l) => s + loanCut(l.balance, l.installment), 0);
    db.prepare("INSERT INTO PayrollLine (runId, employeeId, base, allowances, deductions, loanCut, net) VALUES (?,?,?,?,?,?,?)")
      .run(id, e.id, e.base, e.allowances, e.deductions, cut, netPay({ base: e.base, allowances: e.allowances, deductions: e.deductions, loanCut: cut }));
  }
  return id;
}

export function getRun(id: number) {
  peopleTables();
  const db = getDb();
  const run = db.prepare("SELECT * FROM PayrollRun WHERE id=?").get(id);
  if (!run) return null;
  return { run, lines: db.prepare(`SELECT l.*, e.name FROM PayrollLine l LEFT JOIN Employee e ON e.id=l.employeeId WHERE l.runId=?`).all(id) };
}

export function payslip(runId: number, employeeId: number) {
  peopleTables();
  const db = getDb();
  const run = db.prepare("SELECT * FROM PayrollRun WHERE id=?").get(runId) as
    { id: number; month: string; status: string } | undefined;
  if (!run) throw new Error("no run");
  const line = db.prepare(`SELECT l.*, e.name, e.designation, e.dept FROM PayrollLine l
    LEFT JOIN Employee e ON e.id=l.employeeId WHERE l.runId=? AND l.employeeId=?`).get(runId, employeeId) as
    { employeeId: number; name: string; designation: string; dept: string; base: number; allowances: number; deductions: number; loanCut: number; net: number } | undefined;
  if (!line) throw new Error("no slip for employee");
  const ytd = db.prepare(`SELECT COALESCE(SUM(l.net),0) s, COUNT(*) n FROM PayrollLine l
    JOIN PayrollRun r ON r.id=l.runId
    WHERE l.employeeId=? AND substr(r.month,1,4)=substr(?,1,4)`).get(employeeId, run.month) as { s: number; n: number };
  const loan = db.prepare("SELECT balance, installment FROM EmpLoan WHERE employeeId=? AND status='open' ORDER BY id LIMIT 1").get(employeeId) as
    { balance: number; installment: number } | undefined;
  return { run, line, ytd, loan: loan ?? null };
}

// Headcount + monthly attendance % + payroll register (owner registers).
export function hrReports(month: string) {
  peopleTables();
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("month like YYYY-MM");
  const db = getDb();
  const emps = db.prepare("SELECT id, name, dept FROM Employee WHERE active=1").all() as
    { id: number; name: string; dept: string }[];
  const runs = db.prepare("SELECT id, status FROM PayrollRun WHERE month=?").all(month) as
    { id: number; status: string }[];
  const totals = runs.length
    ? (db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(net),0) s FROM PayrollLine WHERE runId IN
        (SELECT id FROM PayrollRun WHERE month=?)`).get(month) as { n: number; s: number })
    : { n: 0, s: 0 };
  const att = emps.map((e) => {
    const m = monthAttendance(e.id, month) as { marks: number; present?: number };
    const present = (m as Record<string, number>).present ?? m.marks;
    return { id: e.id, name: e.name, dept: e.dept, days: m.marks, present };
  });
  return {
    headcount: emps.length,
    byDept: emps.reduce<Record<string, number>>((a, e) => ({ ...a, [e.dept || "—"]: (a[e.dept || "—"] ?? 0) + 1 }), {}),
    payroll: { runs: runs.map((r) => r.status), lines: totals.n, total: totals.s },
    attendance: att,
  };
}

export function listRuns() {
  peopleTables();
  return getDb().prepare("SELECT * FROM PayrollRun ORDER BY month DESC LIMIT 24").all();
}

// Run states: draft → reviewed → approved → locked → paid (forward only).
const RUN_FLOW = ["draft", "reviewed", "approved", "locked", "paid"] as const;

export function setRunStatus(id: number, to: string): void {
  peopleTables();
  if (!RUN_FLOW.includes(to as (typeof RUN_FLOW)[number])) throw new Error("bad status");
  const db = getDb();
  const r = db.prepare("SELECT status FROM PayrollRun WHERE id=?").get(id) as { status: string } | undefined;
  if (!r) throw new Error("no run");
  const from = RUN_FLOW.indexOf(r.status as (typeof RUN_FLOW)[number]);
  const next = RUN_FLOW.indexOf(to as (typeof RUN_FLOW)[number]);
  if (from < 0 || next !== from + 1) throw new Error(`${r.status} → ${to} not allowed`);
  db.prepare("UPDATE PayrollRun SET status=? WHERE id=?").run(to, id);
}

export function listStructures() {
  peopleTables();
  return getDb().prepare("SELECT * FROM SalaryStructure ORDER BY name").all();
}

export function saveStructure(name: string, base: number, allowances: number, deductions: number): number {
  peopleTables();
  const n = name.trim().slice(0, 80);
  if (!n) throw new Error("name required");
  return Number(getDb().prepare("INSERT INTO SalaryStructure (name, base, allowances, deductions) VALUES (?,?,?,?) ON CONFLICT(name) DO UPDATE SET base=excluded.base, allowances=excluded.allowances, deductions=excluded.deductions")
    .run(n, Math.max(0, Math.round(base)), Math.max(0, Math.round(allowances)), Math.max(0, Math.round(deductions))).lastInsertRowid);
}

export function applyStructure(employeeId: number, structureId: number): void {
  peopleTables();
  const db = getDb();
  const s = db.prepare("SELECT base, allowances, deductions FROM SalaryStructure WHERE id=?").get(structureId) as
    { base: number; allowances: number; deductions: number } | undefined;
  if (!s) throw new Error("no structure");
  if (!db.prepare("SELECT id FROM Employee WHERE id=?").get(employeeId)) throw new Error("no employee");
  db.prepare("UPDATE Employee SET base=?, allowances=?, deductions=? WHERE id=?").run(s.base, s.allowances, s.deductions, employeeId);
}

export async function payRun(id: number, accountId = 1): Promise<{ paid: number; total: number }> {
  peopleTables();
  const db = getDb();
  const run = db.prepare("SELECT month, status FROM PayrollRun WHERE id=?").get(id) as { month: string; status: string } | undefined;
  if (!run) throw new Error("no run");
  if (run.status !== "locked") throw new Error(`pay needs a locked run (now ${run.status})`);
  const lines = db.prepare("SELECT * FROM PayrollLine WHERE runId=?").all(id) as
    { employeeId: number; net: number }[];
  const total = lines.reduce((s, l) => s + l.net, 0);
  const { bankMove } = await import("./billing");
  const { ledgerPost } = await import("./finance");
  db.exec("BEGIN");
  try {
    for (const l of lines) {
      if (l.net > 0) bankMove(accountId, "out", l.net, `payroll:${run.month}`, `emp#${l.employeeId}`);
      // Settle the loan slice taken in this run.
      for (const loan of db.prepare("SELECT id, balance, installment FROM EmpLoan WHERE employeeId=? AND status='open'").all(l.employeeId) as
        { id: number; balance: number; installment: number }[]) {
        const cut = loanCut(loan.balance, loan.installment);
        const nb = loan.balance - cut;
        db.prepare("UPDATE EmpLoan SET balance=?, status=? WHERE id=?").run(nb, nb <= 0 ? "closed" : "open", loan.id);
      }
    }
    ledgerPost({ kind: "adjust", refId: id, amount: total, memo: `payroll ${run.month}` });
    db.prepare("UPDATE PayrollRun SET status='paid' WHERE id=?").run(id);
    db.exec("COMMIT");
    return { paid: lines.length, total };
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch { /* already out */ }
    throw e;
  }
}

// ---- attendance / leave / timesheets ----
const MARK = ["present", "absent", "half", "leave"];

export function markAttendance(employeeId: number, day: string, status: string): void {
  peopleTables();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("day like YYYY-MM-DD");
  if (!MARK.includes(status)) throw new Error("bad mark");
  getDb().prepare("INSERT INTO Attendance (employeeId, day, status) VALUES (?,?,?) ON CONFLICT(employeeId, day) DO UPDATE SET status=excluded.status")
    .run(employeeId, day, status);
}

export function monthAttendance(employeeId: number, month: string) {
  peopleTables();
  const rows = getDb().prepare("SELECT status FROM Attendance WHERE employeeId=? AND day LIKE ?").all(employeeId, `${month}%`) as { status: string }[];
  return { marks: rows.length, ...attendanceSummary(rows.map((r) => r.status)) };
}

export function requestLeave(input: { employeeId: number; fromDay: string; toDay: string; kind?: string; notes?: string }): number {
  peopleTables();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fromDay) || !/^\d{4}-\d{2}-\d{2}$/.test(input.toDay)) throw new Error("bad days");
  if (input.toDay < input.fromDay) throw new Error("ends before it starts");
  return Number(getDb().prepare("INSERT INTO LeaveReq (employeeId, fromDay, toDay, kind, notes) VALUES (?,?,?,?,?)")
    .run(input.employeeId, input.fromDay, input.toDay, (input.kind ?? "casual").slice(0, 20), (input.notes ?? "").slice(0, 300)).lastInsertRowid);
}

export function setLeave(id: number, to: "approved" | "rejected"): void {
  peopleTables();
  if (!["approved", "rejected"].includes(to)) throw new Error("bad status");
  getDb().prepare("UPDATE LeaveReq SET status=? WHERE id=?").run(to, id);
}

// ---- shifts + roster + onboarding (plan 07 slice 2) ----
export const ONBOARD_ITEMS = ["Offer letter", "ID proof", "Bank details", "Device issue", "Intro walkthrough", "First task assigned"];

export function listShifts() {
  peopleTables();
  return getDb().prepare("SELECT * FROM Shift ORDER BY id").all();
}

export function saveShift(input: { id?: number; name: string; start?: string; end?: string }): number {
  peopleTables();
  const clean = (v: string | undefined, fb: string) =>
    /^([01]\d|2[0-3]):[0-5]\d$/.test(v ?? "") ? v! : fb;
  if (input.id) {
    getDb().prepare("UPDATE Shift SET name=?, start=?, end=? WHERE id=?")
      .run(input.name.trim().slice(0, 60) || "Shift", clean(input.start, "09:00"), clean(input.end, "18:00"), input.id);
    return input.id;
  }
  return Number(getDb().prepare("INSERT INTO Shift (name, start, end) VALUES (?,?,?)")
    .run(input.name.trim().slice(0, 60) || "Shift", clean(input.start, "09:00"), clean(input.end, "18:00")).lastInsertRowid);
}

export function weekRoster(monday: string) {
  peopleTables();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(monday)) throw new Error("monday like YYYY-MM-DD");
  const days: string[] = [];
  const base = new Date(`${monday}T00:00:00Z`).getTime();
  for (let i = 0; i < 7; i++) days.push(new Date(base + i * 86400_000).toISOString().slice(0, 10));
  const rows = getDb().prepare(`SELECT employeeId, day, shiftId FROM Roster WHERE day >= ? AND day <= ?`).all(days[0], days[6]) as
    { employeeId: number; day: string; shiftId: number }[];
  const map: Record<string, number> = {};
  for (const r of rows) map[`${r.employeeId}:${r.day}`] = r.shiftId;
  return { days, map };
}

export function setRoster(employeeId: number, day: string, shiftId: number): void {
  peopleTables();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("day like YYYY-MM-DD");
  if (!shiftId) {
    getDb().prepare("DELETE FROM Roster WHERE employeeId=? AND day=?").run(employeeId, day);
    return;
  }
  getDb().prepare("INSERT INTO Roster (employeeId, day, shiftId) VALUES (?,?,?) ON CONFLICT(employeeId, day) DO UPDATE SET shiftId=excluded.shiftId")
    .run(employeeId, day, shiftId);
}

export function onboardList(employeeId: number): { item: string; done: boolean }[] {
  peopleTables();
  const db = getDb();
  for (const item of ONBOARD_ITEMS) {
    db.prepare("INSERT INTO OnboardCheck (employeeId, item) VALUES (?,?) ON CONFLICT(employeeId, item) DO NOTHING").run(employeeId, item);
  }
  return db.prepare("SELECT item, done FROM OnboardCheck WHERE employeeId=? ORDER BY item").all(employeeId).map((r) => {
    const row = r as { item: string; done: number };
    return { item: row.item, done: row.done === 1 };
  });
}

export function onboardToggle(employeeId: number, item: string): boolean {
  peopleTables();
  const db = getDb();
  const r = db.prepare("SELECT done FROM OnboardCheck WHERE employeeId=? AND item=?").get(employeeId, item) as
    { done: number } | undefined;
  if (!r) throw new Error("no item");
  const next = r.done ? 0 : 1;
  db.prepare("UPDATE OnboardCheck SET done=? WHERE employeeId=? AND item=?").run(next, employeeId, item);
  return next === 1;
}

// ---- expenses + overtime (plan 07 slice 3) ----
const EXPENSE_FLOW = ["draft", "submitted", "approved", "rejected", "paid"] as const;

export function fileExpense(employeeId: number, head: string, amount: number): number {
  peopleTables();
  if (Math.round(amount) <= 0) throw new Error("amount must be positive");
  if (!head.trim()) throw new Error("head required");
  return Number(getDb().prepare("INSERT INTO HrExpense (employeeId, head, amount) VALUES (?,?,?)")
    .run(employeeId, head.trim().slice(0, 120), Math.round(amount)).lastInsertRowid);
}

export function listExpenses(status = "") {
  peopleTables();
  return getDb().prepare(status
    ? `SELECT x.*, e.name FROM HrExpense x LEFT JOIN Employee e ON e.id=x.employeeId WHERE x.status=? ORDER BY x.id DESC LIMIT 50`
    : `SELECT x.*, e.name FROM HrExpense x LEFT JOIN Employee e ON e.id=x.employeeId ORDER BY x.id DESC LIMIT 50`)
    .all(...(status ? [status] : []));
}

export function setExpense(id: number, to: string): void {
  peopleTables();
  if (!EXPENSE_FLOW.includes(to as (typeof EXPENSE_FLOW)[number])) throw new Error("bad status");
  const cur = getDb().prepare("SELECT status FROM HrExpense WHERE id=?").get(id) as { status: string } | undefined;
  if (!cur) throw new Error("no expense");
  // Terminal states are final; paid flows through approve first.
  if (cur.status === "paid" || cur.status === "rejected") throw new Error(`${cur.status} is final`);
  if (to === "paid" && cur.status !== "approved") throw new Error("approve before paying");
  if (to === "approved" && cur.status !== "submitted") throw new Error("submit before approving");
  getDb().prepare("UPDATE HrExpense SET status=? WHERE id=?").run(to, id);
}

// Overtime: logged week hours minus rostered shift hours (shifts without an
// end-after-start span count their nominal length; missing roster = 0 baseline).
export function weekOvertime(employeeId: number, monday: string): { logged: number; rostered: number; overtime: number } {
  peopleTables();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(monday)) throw new Error("monday like YYYY-MM-DD");
  const logged = weekHours(employeeId, monday);
  const db = getDb();
  const rows = db.prepare(`SELECT s.start, s.end FROM Roster r JOIN Shift s ON s.id=r.shiftId
    WHERE r.employeeId=? AND r.day >= ? AND r.day < date(?,'+7 days')`).all(employeeId, monday, monday) as
    { start: string; end: string }[];
  const span = (a: string, b: string) => {
    const t = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + (m || 0); };
    if (!/^\d{2}:\d{2}$/.test(a) || !/^\d{2}:\d{2}$/.test(b)) return 0;
    let d = t(b) - t(a);
    if (d <= 0) d += 24 * 60; // night shifts cross midnight
    return d / 60;
  };
  const rostered = rows.reduce((s, r) => s + span(r.start, r.end), 0);
  return { logged, rostered, overtime: Math.max(0, Math.round((logged - rostered) * 10) / 10) };
}

// ---- designations + offers + lifecycle (plan 07 slice 4) ----
export function listDesignations() {
  peopleTables();
  return getDb().prepare("SELECT * FROM Designation ORDER BY title").all();
}

export function saveDesignation(title: string, grade = "", minPay = 0, maxPay = 0) {
  peopleTables();
  const t = title.trim().slice(0, 80);
  if (!t) throw new Error("title required");
  getDb().prepare("INSERT INTO Designation (title, grade, minPay, maxPay) VALUES (?,?,?,?) ON CONFLICT(title) DO UPDATE SET grade=excluded.grade, minPay=excluded.minPay, maxPay=excluded.maxPay")
    .run(t, grade.slice(0, 20), Math.max(0, Math.round(minPay)), Math.max(0, Math.round(maxPay)));
}

export function makeOffer(input: { name: string; email?: string; designation?: string; ctc?: number; joining?: string }): number {
  peopleTables();
  if (!input.name.trim()) throw new Error("name required");
  return Number(getDb().prepare("INSERT INTO JobOffer (name, email, designation, ctc, joining) VALUES (?,?,?,?,?)")
    .run(input.name.trim().slice(0, 120), (input.email ?? "").slice(0, 120), (input.designation ?? "").slice(0, 80),
      Math.max(0, Math.round(input.ctc ?? 0)), (input.joining ?? "").slice(0, 10)).lastInsertRowid);
}

export function listOffers(status = "") {
  peopleTables();
  return getDb().prepare(status
    ? "SELECT * FROM JobOffer WHERE status=? ORDER BY id DESC LIMIT 50"
    : "SELECT * FROM JobOffer ORDER BY id DESC LIMIT 50").all(...(status ? [status] : []));
}

export function setOffer(id: number, to: string): number | null {
  peopleTables();
  if (!["accepted", "declined", "withdrawn"].includes(to)) throw new Error("bad status");
  const db = getDb();
  const o = db.prepare("SELECT * FROM JobOffer WHERE id=?").get(id) as
    { name: string; email: string; designation: string; ctc: number; joining: string; status: string } | undefined;
  if (!o || o.status !== "offered") throw new Error("offer not open");
  db.prepare("UPDATE JobOffer SET status=? WHERE id=?").run(to, id);
  if (to !== "accepted") return null;
  // Accepted → employee row + timeline seed (one hire, no duplicates).
  const monthly = Math.round(o.ctc / 12);
  return saveEmployee({ name: o.name, email: o.email, designation: o.designation, base: monthly, joinedAt: o.joining || new Date().toISOString().slice(0, 10) });
}

export function logEmpEvent(employeeId: number, kind: string, detail = ""): void {
  peopleTables();
  const k = ["promotion", "transfer", "probation", "confirmed", "resigned", "exited", "note"].includes(kind) ? kind : "note";
  getDb().prepare("INSERT INTO EmpEvent (employeeId, kind, detail) VALUES (?,?,?)")
    .run(employeeId, k, detail.slice(0, 300));
}

export function empTimeline(employeeId: number) {
  peopleTables();
  return getDb().prepare("SELECT kind, detail, at FROM EmpEvent WHERE employeeId=? ORDER BY id DESC LIMIT 50").all(employeeId);
}

export function fileExit(employeeId: number, reason: string, lastDay: string): void {
  peopleTables();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastDay)) throw new Error("last day like YYYY-MM-DD");
  getDb().prepare("INSERT INTO ExitCase (employeeId, reason, lastDay) VALUES (?,?,?) ON CONFLICT(employeeId) DO UPDATE SET reason=excluded.reason, lastDay=excluded.lastDay, status='resigned'")
    .run(employeeId, reason.slice(0, 200), lastDay);
  logEmpEvent(employeeId, "resigned", `${reason.slice(0, 200)} · last day ${lastDay}`);
}

export function exitCase(employeeId: number) {
  peopleTables();
  return getDb().prepare("SELECT * FROM ExitCase WHERE employeeId=?").get(employeeId) as
    { employeeId: number; reason: string; lastDay: string; status: string; clearance: string } | undefined ?? null;
}

export function setClearance(employeeId: number, key: string, done: boolean): void {
  peopleTables();
  const cur = exitCase(employeeId);
  if (!cur) throw new Error("no exit case");
  let map: Record<string, boolean> = {};
  try { map = JSON.parse(cur.clearance || "{}"); } catch { /* reset */ }
  map[key.slice(0, 40)] = done;
  getDb().prepare("UPDATE ExitCase SET clearance=? WHERE employeeId=?").run(JSON.stringify(map).slice(0, 2000), employeeId);
}

export function closeExit(employeeId: number): void {
  peopleTables();
  const cur = exitCase(employeeId);
  if (!cur || cur.status !== "resigned") throw new Error("nothing to close");
  getDb().prepare("UPDATE ExitCase SET status='exited' WHERE employeeId=?").run(employeeId);
  getDb().prepare("UPDATE Employee SET active=0 WHERE id=?").run(employeeId);
  logEmpEvent(employeeId, "exited", "clearance complete, deactivated");
}

// Dues statement for full-and-final: unused earned leave value + open loans +
// unpaid approved expenses. Read-only math, payout stays manual.
export function fullFinal(employeeId: number): { earnedLeft: number; leaveValue: number; openLoans: number; unpaidExpenses: number } {
  peopleTables();
  const db = getDb();
  const emp = db.prepare("SELECT base FROM Employee WHERE id=?").get(employeeId) as { base: number } | undefined;
  if (!emp) throw new Error("no employee");
  const earned = leaveBalances(employeeId).find((b) => b.kind === "earned");
  const earnedLeft = earned?.left ?? 0;
  const openLoans = (db.prepare("SELECT COALESCE(SUM(balance),0) s FROM EmpLoan WHERE employeeId=? AND status='open'").get(employeeId) as { s: number }).s;
  const unpaidExpenses = (db.prepare("SELECT COALESCE(SUM(amount),0) s FROM HrExpense WHERE employeeId=? AND status='approved'").get(employeeId) as { s: number }).s;
  return {
    earnedLeft,
    leaveValue: Math.round((earnedLeft * (emp.base || 0)) / 30),
    openLoans,
    unpaidExpenses,
  };
}

// ---- recruitment + training (plan 07 slice 8) ----
const CANDIDATE_FLOW = ["applied", "screening", "interview", "offered", "hired", "declined"] as const;

export function addCandidate(name: string, phone = "", designation = ""): number {
  peopleTables();
  if (!name.trim()) throw new Error("name required");
  return Number(getDb().prepare("INSERT INTO Candidate (name, phone, designation) VALUES (?,?,?)")
    .run(name.trim().slice(0, 120), phone.replace(/\D/g, "").slice(-10), designation.slice(0, 80)).lastInsertRowid);
}

export function listCandidates(stage = "") {
  peopleTables();
  return getDb().prepare(stage
    ? "SELECT * FROM Candidate WHERE stage=? ORDER BY id DESC LIMIT 50"
    : "SELECT * FROM Candidate ORDER BY id DESC LIMIT 50").all(...(isStage(stage) ? [stage] : []));
}

function isStage(s: string): boolean { return (CANDIDATE_FLOW as readonly string[]).includes(s); }

export function moveCandidate(id: number, to: string): number | null {
  peopleTables();
  if (!isStage(to)) throw new Error("bad stage");
  const db = getDb();
  const c = db.prepare("SELECT * FROM Candidate WHERE id=?").get(id) as
    { name: string; phone: string; designation: string; stage: string } | undefined;
  if (!c) throw new Error("no candidate");
  const order = (CANDIDATE_FLOW as readonly string[]).indexOf(c.stage);
  const next = (CANDIDATE_FLOW as readonly string[]).indexOf(to);
  // Forward flow only (declined is terminal from anywhere except hired).
  if (c.stage === "hired") throw new Error("already hired");
  if (to !== "declined" && next !== order + 1) throw new Error(`${c.stage} → ${to} not allowed`);
  if (to === "declined" && c.stage === "hired") throw new Error("already hired");
  db.prepare("UPDATE Candidate SET stage=? WHERE id=?").run(to, id);
  if (to !== "offered") return null;
  // Offered → job offer row (hire decision stays explicit in Offers).
  return makeOffer({ name: c.name, designation: c.designation });
}

export function logTraining(employeeId: number, course: string, onDay: string, status = "planned"): number {
  peopleTables();
  if (!course.trim()) throw new Error("course required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(onDay)) throw new Error("day like YYYY-MM-DD");
  if (!["planned", "done"].includes(status)) throw new Error("bad status");
  if (!getDb().prepare("SELECT id FROM Employee WHERE id=?").get(employeeId)) throw new Error("no employee");
  return Number(getDb().prepare("INSERT INTO Training (employeeId, course, onDay, status) VALUES (?,?,?,?)")
    .run(employeeId, course.trim().slice(0, 120), onDay, status).lastInsertRowid);
}

export function listTraining(employeeId: number) {
  peopleTables();
  return getDb().prepare("SELECT * FROM Training WHERE employeeId=? ORDER BY onDay DESC LIMIT 30").all(employeeId);
}

export function completeTraining(id: number): void {
  peopleTables();
  getDb().prepare("UPDATE Training SET status='done' WHERE id=?").run(id);
}

// ---- performance cycles (plan 07 slice 7) ----
export function createCycle(name: string, period = ""): number {
  peopleTables();
  if (!name.trim()) throw new Error("name required");
  return Number(getDb().prepare("INSERT INTO PerfCycle (name, period) VALUES (?,?)")
    .run(name.trim().slice(0, 120), period.slice(0, 20)).lastInsertRowid);
}

export function listCycles() {
  peopleTables();
  return getDb().prepare("SELECT * FROM PerfCycle ORDER BY id DESC LIMIT 20").all();
}

export function closeCycle(id: number): void {
  peopleTables();
  getDb().prepare("UPDATE PerfCycle SET status='closed' WHERE id=?").run(id);
}

export function addGoal(cycleId: number, employeeId: number, title: string, weight = 1): number {
  peopleTables();
  if (!title.trim()) throw new Error("title required");
  if (!getDb().prepare("SELECT id FROM Employee WHERE id=?").get(employeeId)) throw new Error("no employee");
  return Number(getDb().prepare("INSERT INTO PerfGoal (cycleId, employeeId, title, weight) VALUES (?,?,?,?)")
    .run(cycleId, employeeId, title.trim().slice(0, 200), Math.max(1, Math.min(5, Math.round(weight) || 1))).lastInsertRowid);
}

export function cycleDetail(cycleId: number) {
  peopleTables();
  const db = getDb();
  const goals = db.prepare(`SELECT g.*, e.name FROM PerfGoal g LEFT JOIN Employee e ON e.id=g.employeeId
    WHERE g.cycleId=? ORDER BY g.employeeId, g.id`).all(cycleId);
  const reviews = db.prepare(`SELECT r.*, e.name FROM PerfReview r LEFT JOIN Employee e ON e.id=r.employeeId
    WHERE r.cycleId=? ORDER BY r.employeeId`).all(cycleId);
  return { goals, reviews };
}

export function submitReview(cycleId: number, employeeId: number, rating: number, notes = ""): void {
  peopleTables();
  if (![1, 2, 3, 4, 5].includes(Math.round(rating))) throw new Error("rating 1-5");
  if (!getDb().prepare("SELECT id FROM Employee WHERE id=?").get(employeeId)) throw new Error("no employee");
  getDb().prepare(`INSERT INTO PerfReview (cycleId, employeeId, rating, notes, status) VALUES (?,?,?,?, 'submitted')
    ON CONFLICT(cycleId, employeeId) DO UPDATE SET rating=excluded.rating, notes=excluded.notes, status='submitted'`)
    .run(cycleId, employeeId, Math.round(rating), notes.slice(0, 1000));
}

export function completeReview(cycleId: number, employeeId: number): void {
  peopleTables();
  const r = getDb().prepare("SELECT status FROM PerfReview WHERE cycleId=? AND employeeId=?").get(cycleId, employeeId) as
    { status: string } | undefined;
  if (!r || r.status !== "submitted") throw new Error("submit first");
  getDb().prepare("UPDATE PerfReview SET status='complete' WHERE cycleId=? AND employeeId=?").run(cycleId, employeeId);
  logEmpEvent(employeeId, "note", `review complete (cycle #${cycleId})`);
}

// ---- check-in/out + leave balances + holidays (plan 07 daily slice) ----
export function checkIn(employeeId: number, at = ""): number {
  peopleTables();
  const day = (at || new Date().toISOString()).slice(0, 10);
  const open = getDb().prepare("SELECT id FROM AttnLog WHERE employeeId=? AND day=? AND (outAt IS NULL OR outAt='') ORDER BY id DESC LIMIT 1").get(employeeId, day) as
    { id: number } | undefined;
  if (open) return open.id;
  return Number(getDb().prepare("INSERT INTO AttnLog (employeeId, day, inAt) VALUES (?,?,?)")
    .run(employeeId, day, at || new Date().toISOString()).lastInsertRowid);
}

export function checkOut(employeeId: number, at = ""): number {
  peopleTables();
  const day = (at || new Date().toISOString()).slice(0, 10);
  const open = getDb().prepare("SELECT id FROM AttnLog WHERE employeeId=? AND day=? AND (outAt IS NULL OR outAt='') ORDER BY id DESC LIMIT 1").get(employeeId, day) as
    { id: number } | undefined;
  if (!open) throw new Error("not checked in");
  getDb().prepare("UPDATE AttnLog SET outAt=? WHERE id=?").run(at || new Date().toISOString(), open.id);
  return open.id;
}

export function todayPresence(day = ""): { employeeId: number; name: string; inAt: string; outAt: string }[] {
  peopleTables();
  const d = day || new Date().toISOString().slice(0, 10);
  return getDb().prepare(`SELECT a.employeeId, e.name, a.inAt, a.outAt FROM AttnLog a
    LEFT JOIN Employee e ON e.id=a.employeeId WHERE a.day=? ORDER BY a.inAt`).all(d) as
    { employeeId: number; name: string; inAt: string; outAt: string }[];
}

export function leaveBalances(employeeId: number): { kind: string; quota: number; taken: number; left: number }[] {
  peopleTables();
  const db = getDb();
  const types = db.prepare("SELECT kind, quota FROM LeaveType ORDER BY kind").all() as { kind: string; quota: number }[];
  return types.map((t) => {
    const taken = (db.prepare(`SELECT COALESCE(SUM(julianday(toDay) - julianday(fromDay) + 1), 0) n FROM LeaveReq
      WHERE employeeId=? AND kind=? AND status='approved'`).get(employeeId, t.kind) as { n: number }).n;
    const whole = Math.max(0, Math.floor(taken));
    return { kind: t.kind, quota: t.quota, taken: whole, left: Math.max(0, t.quota - whole) };
  });
}

export function listHolidays(limit = 60) {
  peopleTables();
  return getDb().prepare("SELECT day, name FROM Holiday ORDER BY day LIMIT ?").all(limit);
}

export function saveHoliday(day: string, name: string): void {
  peopleTables();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("day like YYYY-MM-DD");
  if (!name.trim()) throw new Error("name required");
  getDb().prepare("INSERT INTO Holiday (day, name) VALUES (?,?) ON CONFLICT(day) DO UPDATE SET name=excluded.name")
    .run(day, name.trim().slice(0, 120));
}

export function deleteHoliday(day: string): void {
  peopleTables();
  getDb().prepare("DELETE FROM Holiday WHERE day=?").run(day);
}

export function listLeaves(status = "") {
  peopleTables();
  return getDb().prepare(status
    ? `SELECT l.*, e.name FROM LeaveReq l LEFT JOIN Employee e ON e.id=l.employeeId WHERE l.status=? ORDER BY l.id DESC LIMIT 50`
    : `SELECT l.*, e.name FROM LeaveReq l LEFT JOIN Employee e ON e.id=l.employeeId ORDER BY l.id DESC LIMIT 50`).all(...(status ? [status] : []));
}

export function logTime(employeeId: number, day: string, hours: number, taskRef = ""): number {
  peopleTables();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("bad day");
  if (!(hours > 0) || hours > 24) throw new Error("bad hours");
  return Number(getDb().prepare("INSERT INTO Timesheet (employeeId, day, hours, taskRef) VALUES (?,?,?,?)")
    .run(employeeId, day, hours, taskRef.slice(0, 120)).lastInsertRowid);
}

export function weekHours(employeeId: number, weekStart: string): number {
  peopleTables();
  const r = getDb().prepare("SELECT COALESCE(SUM(hours),0) s FROM Timesheet WHERE employeeId=? AND day>=? AND day<date(?,'+7 days')").get(employeeId, weekStart, weekStart) as { s: number };
  return r.s;
}

// ---- budgets + forecasts ----
export function listBudgets(month = "") {
  peopleTables();
  return getDb().prepare(month
    ? "SELECT * FROM Budget WHERE month=? ORDER BY head"
    : "SELECT * FROM Budget ORDER BY month DESC, head LIMIT 100").all(...(month ? [month] : []));
}

export function saveBudget(head: string, month: string, planned: number): number {
  peopleTables();
  if (month && !/^\d{4}-\d{2}$/.test(month)) throw new Error("month like YYYY-MM");
  return Number(getDb().prepare("INSERT INTO Budget (head, month, planned) VALUES (?,?,?)")
    .run(head.slice(0, 80), month.slice(0, 7), Math.max(0, Math.round(planned))).lastInsertRowid);
}

export function planSnapshot() {
  peopleTables();
  const db = getDb();
  const months = db.prepare(`SELECT strftime('%Y-%m', createdAt) m, SUM(grand) s FROM ShopOrder
    WHERE createdAt >= date('now','-90 days') AND status!='cancelled' GROUP BY m ORDER BY m`).all() as { m: string; s: number }[];
  const revenueNext = forecastNext(months.map((m) => m.s));
  const recv = (db.prepare("SELECT COALESCE(SUM(grand),0) s FROM BillDoc WHERE status IN ('sent','overdue')").get() as { s: number }).s;
  const pay = (db.prepare("SELECT COALESCE(SUM(amount),0) s FROM SupplierBill WHERE status='unpaid'").get() as { s: number }).s;
  const wage = (db.prepare("SELECT COALESCE(SUM(base+allowances),0) s FROM Employee WHERE active=1").get() as { s: number }).s;
  return {
    revenueNext, receivables: recv, payables: pay, monthlyWages: wage,
    cashFlow: recv - pay - wage,
    trend: months,
  };
}

// ---- BI snapshot ----
export function biSnapshot() {
  peopleTables();
  const db = getDb();
  const rev30 = db.prepare(`SELECT COALESCE(SUM(grand),0) s, COUNT(*) n FROM ShopOrder
    WHERE createdAt >= date('now','-30 days') AND status!='cancelled'`).get() as { s: number; n: number };
  const revPrev = db.prepare(`SELECT COALESCE(SUM(grand),0) s FROM ShopOrder
    WHERE createdAt >= date('now','-60 days') AND createdAt < date('now','-30 days') AND status!='cancelled'`).get() as { s: number };
  const top = db.prepare(`SELECT p.name, SUM(l.qty) q, SUM(l.total) s FROM OrderLine l JOIN Product p ON p.id=l.productId
    GROUP BY p.id ORDER BY s DESC LIMIT 5`).all();
  const slow = db.prepare(`SELECT p.name, COALESCE(s.qty,0) q FROM Product p LEFT JOIN StockLevel s ON s.productId=p.id AND s.warehouseId=1
    WHERE p.kind='physical' AND p.status='active' AND p.id NOT IN (SELECT DISTINCT productId FROM OrderLine) ORDER BY q DESC LIMIT 5`).all();
  const cogs = db.prepare(`SELECT COALESCE(SUM(l.qty * COALESCE(s.avgCost,0)),0) c FROM OrderLine l
    JOIN ShopOrder o ON o.id=l.orderId LEFT JOIN StockLevel s ON s.productId=l.productId AND s.warehouseId=1
    WHERE o.createdAt >= date('now','-30 days') AND o.status!='cancelled'`).get() as { c: number };
  const customers = (db.prepare("SELECT COUNT(*) c FROM Customer").get() as { c: number }).c;
  const repeat = (db.prepare(`SELECT COUNT(DISTINCT customerId) c FROM ShopOrder WHERE customerId>0 AND status!='cancelled'
    GROUP BY customerId HAVING COUNT(*)>1`).all() as unknown[]).length;
  const daily = db.prepare(`SELECT date(createdAt) d, COALESCE(SUM(grand),0) s FROM ShopOrder
    WHERE createdAt >= date('now','-30 days') AND status!='cancelled' GROUP BY d ORDER BY d`).all() as
    { d: string; s: number }[];
  // Funnel: order counts by status (30d). Expiry: lots bucketed by exp month.
  // Defensive: commerce tables may not exist on first boot — never throw.
  const funnel = (() => { try {
    return db.prepare(`SELECT status, COUNT(*) n, COALESCE(SUM(grand),0) s FROM ShopOrder
      WHERE createdAt >= date('now','-30 days') GROUP BY status`).all();
  } catch { return []; } })();
  const expiry = (() => { try {
    return db.prepare(`SELECT substr(exp,1,7) m, COUNT(*) n, COALESCE(SUM(qty),0) q FROM ProductLot
      WHERE qty > 0 AND exp != '' GROUP BY m ORDER BY m LIMIT 6`).all();
  } catch { return []; } })();
  const expiredCount = (() => { try {
    return (db.prepare(`SELECT COUNT(*) c FROM ProductLot
      WHERE qty > 0 AND exp != '' AND exp < strftime('%Y-%m','now')`).get() as { c: number }).c;
  } catch { return 0; } })();
  return {
    revenue30: rev30.s, orders30: rev30.n,
    growth: revPrev.s > 0 ? Math.round(((rev30.s - revPrev.s) / revPrev.s) * 100) : 0,
    margin: marginPct(rev30.s, Math.round(cogs.c)),
    top, slow, customers, repeatBuyers: repeat,
    daily: daily.map((x) => ({ date: x.d.slice(5), revenue: Math.round(x.s / 100) })),
    funnel, expiry, expiredCount,
  };
}
