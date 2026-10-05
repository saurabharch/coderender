// People + planning: employees, payroll + loans, attendance/leave/timesheets,
// budgets, forecasts. Payroll posts to banking + ledger — one book as always.
import { getDb } from "./store";
import { attendanceSummary, forecastNext, loanCut, marginPct, netPay } from "./people-core";

export function peopleTables(): void {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS Employee (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', dept TEXT NOT NULL DEFAULT '', designation TEXT NOT NULL DEFAULT '', base INTEGER NOT NULL DEFAULT 0, allowances INTEGER NOT NULL DEFAULT 0, deductions INTEGER NOT NULL DEFAULT 0, joinedAt TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1)`);
  db.exec(`CREATE TABLE IF NOT EXISTS EmpLoan (id INTEGER PRIMARY KEY AUTOINCREMENT, employeeId INTEGER NOT NULL, amount INTEGER NOT NULL DEFAULT 0, balance INTEGER NOT NULL DEFAULT 0, installment INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'open', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS PayrollRun (id INTEGER PRIMARY KEY AUTOINCREMENT, month TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'draft', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS PayrollLine (id INTEGER PRIMARY KEY AUTOINCREMENT, runId INTEGER NOT NULL, employeeId INTEGER NOT NULL, base INTEGER NOT NULL DEFAULT 0, allowances INTEGER NOT NULL DEFAULT 0, deductions INTEGER NOT NULL DEFAULT 0, loanCut INTEGER NOT NULL DEFAULT 0, net INTEGER NOT NULL DEFAULT 0)`);
  db.exec(`CREATE TABLE IF NOT EXISTS Attendance (employeeId INTEGER NOT NULL, day TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'present', PRIMARY KEY (employeeId, day))`);
  db.exec(`CREATE TABLE IF NOT EXISTS LeaveReq (id INTEGER PRIMARY KEY AUTOINCREMENT, employeeId INTEGER NOT NULL, fromDay TEXT NOT NULL DEFAULT '', toDay TEXT NOT NULL DEFAULT '', kind TEXT NOT NULL DEFAULT 'casual', status TEXT NOT NULL DEFAULT 'pending', notes TEXT NOT NULL DEFAULT '')`);
  db.exec(`CREATE TABLE IF NOT EXISTS Timesheet (id INTEGER PRIMARY KEY AUTOINCREMENT, employeeId INTEGER NOT NULL, day TEXT NOT NULL DEFAULT '', hours REAL NOT NULL DEFAULT 0, taskRef TEXT NOT NULL DEFAULT '')`);
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
    if (ex.status !== "draft") throw new Error("run already paid");
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

export function listRuns() {
  peopleTables();
  return getDb().prepare("SELECT * FROM PayrollRun ORDER BY month DESC LIMIT 24").all();
}

export async function payRun(id: number, accountId = 1): Promise<{ paid: number; total: number }> {
  peopleTables();
  const db = getDb();
  const run = db.prepare("SELECT month, status FROM PayrollRun WHERE id=?").get(id) as { month: string; status: string } | undefined;
  if (!run) throw new Error("no run");
  if (run.status !== "draft") throw new Error("run already paid");
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
  return {
    revenue30: rev30.s, orders30: rev30.n,
    growth: revPrev.s > 0 ? Math.round(((rev30.s - revPrev.s) / revPrev.s) * 100) : 0,
    margin: marginPct(rev30.s, Math.round(cogs.c)),
    top, slow, customers, repeatBuyers: repeat,
    daily: daily.map((x) => ({ date: x.d.slice(5), revenue: Math.round(x.s / 100) })),
  };
}
