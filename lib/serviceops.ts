// Service operations: branches, job cards (book → assign → work → invoice),
// print templates. Bills via billing, notifications via notify — no parallel pipes.
import { getDb } from "./store";
import { jobCan, jobNumber, renderTemplate } from "./service-core";

export function serviceTables(): void {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS Branch (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1)`);
  db.exec(`CREATE TABLE IF NOT EXISTS JobCard (id INTEGER PRIMARY KEY AUTOINCREMENT, no TEXT NOT NULL DEFAULT '', customerId INTEGER NOT NULL DEFAULT 0, branchId INTEGER NOT NULL DEFAULT 1, service TEXT NOT NULL DEFAULT '', staff TEXT NOT NULL DEFAULT '', slot TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'booked', notes TEXT NOT NULL DEFAULT '', billId INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS PrintTemplate (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL UNIQUE, body TEXT NOT NULL DEFAULT '', updatedAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  try { db.exec("ALTER TABLE ShopOrder ADD COLUMN branchId INTEGER NOT NULL DEFAULT 1"); } catch { /* exists */ }
  if ((db.prepare("SELECT COUNT(*) c FROM Branch").get() as { c: number }).c === 0) {
    db.prepare("INSERT INTO Branch (name) VALUES (?)").run("Main");
  }
  const defaults: [string, string][] = [
    ["receipt", "CodeRender\n{{business}}\n---\n{{lines}}\nTotal: {{total}}\n{{footer}}"],
    ["jobcard", "JOB {{no}} — {{service}}\nCustomer: {{customer}}\nStaff: {{staff}} · Slot: {{slot}}\nNotes: {{notes}}"],
  ];
  for (const [kind, body] of defaults) {
    if (!db.prepare("SELECT id FROM PrintTemplate WHERE kind=?").get(kind))
      db.prepare("INSERT INTO PrintTemplate (kind, body) VALUES (?,?)").run(kind, body);
  }
}

// ---- branches ----
export function listBranches() {
  serviceTables();
  return getDb().prepare("SELECT * FROM Branch ORDER BY id").all();
}

export function saveBranch(input: { id?: number; name: string; address?: string; phone?: string; active?: boolean }): number {
  serviceTables();
  const db = getDb();
  if (input.id) {
    if (input.id === 1 && input.active === false) throw new Error("Main branch cannot be deactivated");
    db.prepare("UPDATE Branch SET name=?, address=?, phone=?, active=? WHERE id=?")
      .run(input.id === 1 ? "Main" : input.name.slice(0, 80), (input.address ?? "").slice(0, 200), (input.phone ?? "").slice(0, 20),
        input.active === false ? 0 : 1, input.id);
    return input.id;
  }
  return Number(db.prepare("INSERT INTO Branch (name, address, phone) VALUES (?,?,?)")
    .run(input.name.slice(0, 80), (input.address ?? "").slice(0, 200), (input.phone ?? "").slice(0, 20)).lastInsertRowid);
}

// ---- jobs ----
export function listJobs(status = "", branchId = 0) {
  serviceTables();
  const conds: string[] = [];
  const args: (string | number)[] = [];
  if (status) { conds.push("j.status=?"); args.push(status); }
  if (branchId) { conds.push("j.branchId=?"); args.push(branchId); }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  return getDb().prepare(`SELECT j.*, c.name customer, b.name branch FROM JobCard j
    LEFT JOIN Customer c ON c.id=j.customerId LEFT JOIN Branch b ON b.id=j.branchId
    ${where} ORDER BY j.id DESC LIMIT 50`).all(...args);
}

export function getJob(id: number) {
  serviceTables();
  return getDb().prepare(`SELECT j.*, c.name customer, c.phone, c.email, b.name branch FROM JobCard j
    LEFT JOIN Customer c ON c.id=j.customerId LEFT JOIN Branch b ON b.id=j.branchId WHERE j.id=?`).get(id) ?? null;
}

export function bookJob(input: { customerId?: number; branchId?: number; service: string; staff?: string; slot?: string; notes?: string }): number {
  serviceTables();
  const db = getDb();
  if (input.branchId) {
    const b = db.prepare("SELECT id FROM Branch WHERE id=? AND active=1").get(input.branchId);
    if (!b) throw new Error("unknown branch");
  }
  const id = Number(db.prepare(`INSERT INTO JobCard (customerId, branchId, service, staff, slot, notes)
    VALUES (?,?,?,?,?,?)`).run(input.customerId ?? 0, input.branchId ?? 1, input.service.slice(0, 150),
    (input.staff ?? "").slice(0, 120), (input.slot ?? "").slice(0, 40), (input.notes ?? "").slice(0, 1000)).lastInsertRowid);
  db.prepare("UPDATE JobCard SET no=? WHERE id=?").run(jobNumber(id), id);
  return id;
}

export function setJobStatus(id: number, to: string): void {
  serviceTables();
  const db = getDb();
  const j = db.prepare("SELECT status FROM JobCard WHERE id=?").get(id) as { status: string } | undefined;
  if (!j) throw new Error("no job");
  if (!jobCan(j.status, to)) throw new Error(`${j.status} → ${to} not allowed`);
  db.prepare("UPDATE JobCard SET status=? WHERE id=?").run(to, id);
}

export function assignJob(id: number, staff: string, slot = ""): void {
  serviceTables();
  const db = getDb();
  const j = db.prepare("SELECT status FROM JobCard WHERE id=?").get(id) as { status: string } | undefined;
  if (!j) throw new Error("no job");
  if (!jobCan(j.status, "assigned")) throw new Error(`${j.status} cannot take assignment`);
  db.prepare("UPDATE JobCard SET staff=?, slot=?, status='assigned' WHERE id=?")
    .run(staff.slice(0, 120), slot.slice(0, 40) || "", id);
}

// done → invoice: bill the service lines, link bill, mark invoiced (atomic).
export async function invoiceJob(id: number, lines: { label: string; qty: number; price: number }[]): Promise<{ billId: number; no: string }> {
  serviceTables();
  const db = getDb();
  const j = db.prepare("SELECT status, customerId, billId FROM JobCard WHERE id=?").get(id) as
    { status: string; customerId: number; billId: number } | undefined;
  if (!j) throw new Error("no job");
  if (j.status !== "done") throw new Error("finish the job before billing");
  if (j.billId) throw new Error("already billed");
  const { createBill } = await import("./billing");
  db.exec("BEGIN");
  try {
    const r = createBill({ type: "invoice", customerId: j.customerId, lines, notes: `job #${id}` });
    db.prepare("UPDATE JobCard SET billId=?, status='invoiced' WHERE id=?").run(r.id, id);
    db.exec("COMMIT");
    return { billId: r.id, no: r.no };
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch { /* already out */ }
    throw e;
  }
}

// ---- print templates ----
export function listTemplates() {
  serviceTables();
  return getDb().prepare("SELECT id, kind, updatedAt FROM PrintTemplate ORDER BY kind").all();
}

export function saveTemplate(kind: string, body: string): void {
  serviceTables();
  if (!["receipt", "jobcard"].includes(kind)) throw new Error("bad kind");
  getDb().prepare("INSERT INTO PrintTemplate (kind, body) VALUES (?,?) ON CONFLICT(kind) DO UPDATE SET body=excluded.body, updatedAt=datetime('now')")
    .run(kind, body.slice(0, 8000));
}

export function renderKind(kind: string, vars: Record<string, string>): string {
  serviceTables();
  const t = getDb().prepare("SELECT body FROM PrintTemplate WHERE kind=?").get(kind) as { body: string } | undefined;
  if (!t) throw new Error("no template");
  return renderTemplate(t.body, vars);
}
