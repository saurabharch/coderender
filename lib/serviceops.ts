// Service operations: branches, job cards (book → assign → work → invoice),
// print templates. Bills via billing, notifications via notify — no parallel pipes.
import { getDb } from "./store";
import { jobCan, jobNumber, kotCan, renderTemplate } from "./service-core";

export function serviceTables(): void {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS Branch (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1)`);
  db.exec(`CREATE TABLE IF NOT EXISTS JobCard (id INTEGER PRIMARY KEY AUTOINCREMENT, no TEXT NOT NULL DEFAULT '', customerId INTEGER NOT NULL DEFAULT 0, branchId INTEGER NOT NULL DEFAULT 1, service TEXT NOT NULL DEFAULT '', staff TEXT NOT NULL DEFAULT '', slot TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'booked', notes TEXT NOT NULL DEFAULT '', billId INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS DineTable (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, seats INTEGER NOT NULL DEFAULT 4, status TEXT NOT NULL DEFAULT 'free', captain TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS Venue (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'hall', address TEXT NOT NULL DEFAULT '', capacity INTEGER NOT NULL DEFAULT 0, amenities TEXT NOT NULL DEFAULT '', checkIn TEXT NOT NULL DEFAULT '', checkOut TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active', notes TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE TABLE IF NOT EXISTS VenueRate (id INTEGER PRIMARY KEY AUTOINCREMENT, venueId INTEGER NOT NULL, label TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL DEFAULT 0, unit TEXT NOT NULL DEFAULT 'event', minStay INTEGER NOT NULL DEFAULT 0)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_venuerate_venue ON VenueRate(venueId)`);
  db.exec(`CREATE TABLE IF NOT EXISTS KotTicket (id INTEGER PRIMARY KEY AUTOINCREMENT, no TEXT NOT NULL DEFAULT '', tableId INTEGER NOT NULL DEFAULT 0, captain TEXT NOT NULL DEFAULT '', server TEXT NOT NULL DEFAULT '', lines TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'fired', firedBy TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
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

export function listTables() {
  serviceTables();
  return getDb().prepare("SELECT * FROM DineTable ORDER BY name").all();
}

export function saveTable(input: { id?: number; name: string; seats?: number; captain?: string }): number {
  serviceTables();
  const name = input.name.trim().slice(0, 40);
  if (!name) throw new Error("table name required");
  const seats = Math.min(50, Math.max(1, Math.round(input.seats ?? 4)));
  const db = getDb();
  if (input.id) {
    db.prepare("UPDATE DineTable SET name=?, seats=?, captain=? WHERE id=?")
      .run(name, seats, (input.captain ?? "").slice(0, 120), input.id);
    return input.id;
  }
  return Number(db.prepare("INSERT INTO DineTable (name, seats, captain) VALUES (?,?,?)")
    .run(name, seats, (input.captain ?? "").slice(0, 120)).lastInsertRowid);
}

export interface KotLine { productId: number; name: string; qty: number; note?: string }

// Fire a kitchen ticket: table goes busy, lines snapshot names/prices now.
export function fireKot(input: { tableId: number; lines: { productId: number; qty: number; note?: string }[]; captain?: string; server?: string; firedBy?: string }): number {
  serviceTables();
  const db = getDb();
  const table = db.prepare("SELECT id, captain FROM DineTable WHERE id=?").get(input.tableId) as
    { id: number; captain: string } | undefined;
  if (!table) throw new Error("no table");
  const captain = ((input.captain ?? "").trim() || table.captain || "").slice(0, 120);
  const clean = input.lines.slice(0, 30).map((l) => {
    const p = db.prepare("SELECT name FROM Product WHERE id=? AND status='active'").get(l.productId) as { name: string } | undefined;
    if (!p) throw new Error(`product ${l.productId} unavailable`);
    return { productId: l.productId, name: p.name.slice(0, 120), qty: Math.max(0.001, l.qty), note: (l.note ?? "").slice(0, 120) };
  });
  if (!clean.length) throw new Error("empty ticket");
  const id = Number(db.prepare("INSERT INTO KotTicket (tableId, captain, server, lines, firedBy) VALUES (?,?,?,?,?)")
    .run(input.tableId, captain, (input.server ?? "").slice(0, 120), JSON.stringify(clean), (input.firedBy ?? "").slice(0, 120)).lastInsertRowid);
  const no = `KOT-${String(id).padStart(5, "0")}`;
  db.prepare("UPDATE KotTicket SET no=? WHERE id=?").run(no, id);
  db.prepare("UPDATE DineTable SET status='busy' WHERE id=?").run(input.tableId);
  return id;
}

export function moveKot(id: number, to: string): void {
  serviceTables();
  const db = getDb();
  const cur = db.prepare("SELECT status, tableId FROM KotTicket WHERE id=?").get(id) as { status: string; tableId: number } | undefined;
  if (!cur) throw new Error("no ticket");
  if (!kotCan(cur.status, to)) throw new Error(`${cur.status} → ${to} not allowed`);
  db.prepare("UPDATE KotTicket SET status=? WHERE id=?").run(to, id);
  if (to === "served" || to === "cancelled") {
    const open = db.prepare("SELECT id FROM KotTicket WHERE tableId=? AND status NOT IN ('served','cancelled') LIMIT 1").get(cur.tableId);
    if (!open) db.prepare("UPDATE DineTable SET status='free' WHERE id=?").run(cur.tableId);
  }
}

export function getTicket(id: number) {
  serviceTables();
  const db = getDb();
  const t = db.prepare(`SELECT k.*, t.name tableName FROM KotTicket k LEFT JOIN DineTable t ON t.id=k.tableId WHERE k.id=?`).get(id);
  if (!t) return null;
  return { ...t as object, lines: JSON.parse((t as { lines: string }).lines || "[]") };
}

export function listTickets(status = "") {
  serviceTables();
  const db = getDb();
  return status
    ? db.prepare(`SELECT k.*, t.name tableName FROM KotTicket k LEFT JOIN DineTable t ON t.id=k.tableId WHERE k.status=? ORDER BY k.id DESC LIMIT 100`).all(status)
    : db.prepare(`SELECT k.*, t.name tableName FROM KotTicket k LEFT JOIN DineTable t ON t.id=k.tableId ORDER BY k.id DESC LIMIT 100`).all();
}

export const VENUE_KINDS = ["hotel", "hall", "resort", "apartment", "room"] as const;

export function listVenues(status = "") {
  serviceTables();
  const db = getDb();
  return status
    ? db.prepare("SELECT * FROM Venue WHERE status=? ORDER BY name LIMIT 100").all(status)
    : db.prepare("SELECT * FROM Venue ORDER BY name LIMIT 100").all();
}

export function saveVenue(input: { id?: number; name: string; kind?: string; address?: string; capacity?: number; amenities?: string; checkIn?: string; checkOut?: string; status?: string; notes?: string }): number {
  serviceTables();
  const kinds = ["hotel", "hall", "resort", "apartment", "room"];
  const kind = kinds.includes(input.kind ?? "") ? (input.kind as string) : "hall";
  const name = input.name.trim().slice(0, 120);
  if (!name) throw new Error("venue name required");
  const db = getDb();
  const row = {
    name, kind,
    address: (input.address ?? "").slice(0, 300),
    capacity: Math.min(100000, Math.max(0, Math.round(input.capacity ?? 0))),
    amenities: (input.amenities ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20).join(", "),
    checkIn: (input.checkIn ?? "").slice(0, 5),
    checkOut: (input.checkOut ?? "").slice(0, 5),
    status: ["active", "paused", "closed"].includes(input.status ?? "") ? (input.status as string) : "active",
    notes: (input.notes ?? "").slice(0, 500),
  };
  if (input.id) {
    db.prepare("UPDATE Venue SET name=?, kind=?, address=?, capacity=?, amenities=?, checkIn=?, checkOut=?, status=?, notes=? WHERE id=?")
      .run(row.name, row.kind, row.address, row.capacity, row.amenities, row.checkIn, row.checkOut, row.status, row.notes, input.id);
    return input.id;
  }
  return Number(db.prepare("INSERT INTO Venue (name, kind, address, capacity, amenities, checkIn, checkOut, status, notes) VALUES (?,?,?,?,?,?,?,?,?)")
    .run(row.name, row.kind, row.address, row.capacity, row.amenities, row.checkIn, row.checkOut, row.status, row.notes).lastInsertRowid);
}

export function getVenue(id: number) {
  serviceTables();
  const db = getDb();
  const v = db.prepare("SELECT * FROM Venue WHERE id=?").get(id);
  if (!v) return null;
  return {
    ...v as object,
    rates: db.prepare("SELECT * FROM VenueRate WHERE venueId=? ORDER BY amount").all(id),
    bookings: db.prepare("SELECT * FROM Booking WHERE resourceKind='venue' AND resourceId=? AND status NOT IN ('cancelled') ORDER BY startAt LIMIT 50").all(id),
  };
}

export function saveRate(input: { id?: number; venueId: number; label: string; amount: number; unit?: string; minStay?: number }): number {
  serviceTables();
  const db = getDb();
  if (!db.prepare("SELECT id FROM Venue WHERE id=?").get(input.venueId)) throw new Error("no venue");
  const units = ["hour", "night", "event", "day", "month"];
  const unit = units.includes(input.unit ?? "") ? (input.unit as string) : "event";
  const amt = Math.max(0, Math.round(input.amount));
  if (!(amt > 0)) throw new Error("rate amount required");
  if (input.id) {
    db.prepare("UPDATE VenueRate SET label=?, amount=?, unit=?, minStay=? WHERE id=? AND venueId=?")
      .run(input.label.trim().slice(0, 80) || "Standard", amt, unit, Math.max(0, Math.round(input.minStay ?? 0)), input.id, input.venueId);
    return input.id;
  }
  return Number(db.prepare("INSERT INTO VenueRate (venueId, label, amount, unit, minStay) VALUES (?,?,?,?,?)")
    .run(input.venueId, input.label.trim().slice(0, 80) || "Standard", amt, unit, Math.max(0, Math.round(input.minStay ?? 0))).lastInsertRowid);
}

export function dropRate(id: number): void {
  serviceTables();
  getDb().prepare("DELETE FROM VenueRate WHERE id=?").run(id);
}
