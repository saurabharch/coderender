// Unified bookings: one allocator for halls, rooms, stays, tables.
// Resources are generic (kind + id); every write passes the atomic overlap
// check — a conflicting booking is refused, never queued silently.
import { getDb } from "./store";
import { findConflict } from "./booking-core";

export function bookingTables(): void {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS Booking (id INTEGER PRIMARY KEY AUTOINCREMENT, resourceKind TEXT NOT NULL DEFAULT 'room', resourceId INTEGER NOT NULL DEFAULT 0, customerId INTEGER NOT NULL DEFAULT 0, name TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', startAt TEXT NOT NULL DEFAULT '', endAt TEXT NOT NULL DEFAULT '', bufferMin INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'confirmed', notes TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_booking_resource ON Booking(resourceKind, resourceId, status)`);
  try { db.exec("ALTER TABLE Booking ADD COLUMN holdExpiresAt TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
}

export interface PlaceInput {
  resourceKind: string;
  resourceId: number;
  customerId?: number;
  name?: string;
  phone?: string;
  startAt: string;
  endAt: string;
  bufferMin?: number;
  notes?: string;
}

// Atomic check-then-insert: the overlap recheck runs inside the write
// transaction, so concurrent writers cannot both slip through.
export function placeBooking(input: PlaceInput): number {
  bookingTables();
  const db = getDb();
  const kind = input.resourceKind.trim().slice(0, 40) || "room";
  const buf = Math.min(480, Math.max(0, Math.round(input.bufferMin ?? 0)));
  db.exec("BEGIN IMMEDIATE");
  try {
    const existing = db.prepare(
      `SELECT startAt start, endAt end FROM Booking
       WHERE resourceKind=? AND resourceId=?
         AND (status NOT IN ('cancelled', 'held') OR (status='held' AND holdExpiresAt > datetime('now')))`)
      .all(kind, input.resourceId) as
      { start: string; end: string }[];
    const clash = findConflict(existing, input.startAt, input.endAt, buf);
    if (clash) throw new Error("slot taken for this resource");
    const id = Number(db.prepare(
      `INSERT INTO Booking (resourceKind, resourceId, customerId, name, phone, startAt, endAt, bufferMin, notes)
       VALUES (?,?,?,?,?,?,?,?,?)`).run(
      kind, input.resourceId, input.customerId ?? 0,
      (input.name ?? "").slice(0, 120), (input.phone ?? "").slice(0, 20),
      input.startAt.slice(0, 25), input.endAt.slice(0, 25), buf,
      (input.notes ?? "").slice(0, 500)).lastInsertRowid);
    db.exec("COMMIT");
    return id;
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch { /* already out */ }
    throw e;
  }
}

// Confirmation document for the shared bill renderers: no money moves
// here (pay at venue), so totals read 0 with the booking ref as memo.
export function confirmationDoc(id: number) {
  bookingTables();
  const db = getDb();
  const row = db.prepare("SELECT * FROM Booking WHERE id=?").get(id) as
    { id: number; resourceKind: string; resourceId: number; name: string; phone: string; startAt: string; endAt: string; status: string } | undefined;
  if (!row) return null;
  let venue = `${row.resourceKind} #${row.resourceId}`;
  if (row.resourceKind === "venue") {
    const v = db.prepare("SELECT name FROM Venue WHERE id=?").get(row.resourceId) as { name: string } | undefined;
    if (v) venue = v.name;
  }
  const when = `${row.startAt.slice(0, 16).replace("T", " ")} → ${row.endAt.slice(0, 16).replace("T", " ")}`;
  return {
    no: `BKG-${String(row.id).padStart(5, "0")}`,
    kind: "BOOKING CONFIRMATION",
    date: new Date().toISOString().slice(0, 10),
    billTo: `${row.name || "Guest"}${row.phone ? ` · ${row.phone}` : ""}`,
    lines: [{ label: `${venue} · ${when}`, amount: 0 }],
    total: 0,
    status: row.status,
    memo: `Pay at venue · booking #${row.id}`,
  };
}

export function cancelBooking(id: number): void {
  bookingTables();
  getDb().prepare("UPDATE Booking SET status='cancelled' WHERE id=?").run(id);
}

// Public hold: tentative slice with a 15-minute fuse. Anyone (staff sweep
// or the next allocator write) treats lapsed holds as free; confirm flips
// a live hold to a real booking, never extends it.
export async function holdBooking(input: PlaceInput): Promise<{ id: number; expiresAt: string }> {
  bookingTables();
  const db = getDb();
  const expires = new Date(Date.now() + 15 * 60000).toISOString().slice(0, 19).replace("T", " ");
  const id = placeBooking(input);
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE Booking SET status='held', holdExpiresAt=? WHERE id=?").run(expires, id);
    const row = db.prepare("SELECT resourceKind, resourceId, startAt, endAt, bufferMin FROM Booking WHERE id=?").get(id) as
      { resourceKind: string; resourceId: number; startAt: string; endAt: string; bufferMin: number };
    const { findConflict } = await import("./booking-core");
    const clash = findConflict(
      (db.prepare(`SELECT startAt start, endAt end FROM Booking WHERE resourceKind=? AND resourceId=? AND id!=?
         AND (status NOT IN ('cancelled','held') OR (status='held' AND holdExpiresAt > datetime('now')))`)
        .all(row.resourceKind, row.resourceId, id) as { start: string; end: string }[]),
      row.startAt, row.endAt, row.bufferMin);
    if (clash) throw new Error("slot taken for this resource");
    db.exec("COMMIT");
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch { /* already out */ }
    db.prepare("UPDATE Booking SET status='cancelled' WHERE id=?").run(id);
    throw e;
  }
  return { id, expiresAt: expires };
}

export function confirmHold(id: number): void {
  bookingTables();
  const db = getDb();
  const cur = db.prepare("SELECT status, holdExpiresAt FROM Booking WHERE id=?").get(id) as
    { status: string; holdExpiresAt: string } | undefined;
  if (!cur) throw new Error("no booking");
  if (cur.status !== "held") throw new Error("not a hold");
  if (cur.holdExpiresAt && cur.holdExpiresAt <= new Date().toISOString().slice(0, 19).replace("T", " ")) {
    db.prepare("UPDATE Booking SET status='cancelled' WHERE id=?").run(id);
    throw new Error("hold lapsed — search again");
  }
  db.prepare("UPDATE Booking SET status='confirmed', holdExpiresAt='' WHERE id=?").run(id);
}

export function resourceBookings(kind: string, resourceId: number, from = "", to = ""): unknown[] {
  bookingTables();
  const db = getDb();
  if (from && to) {
    return db.prepare(`SELECT * FROM Booking WHERE resourceKind=? AND resourceId=? AND status NOT IN ('cancelled')
      AND startAt < ? AND endAt > ? ORDER BY startAt`).all(kind, resourceId, to, from);
  }
  return db.prepare(`SELECT * FROM Booking WHERE resourceKind=? AND resourceId=? AND status NOT IN ('cancelled')
    ORDER BY startAt LIMIT 100`).all(kind, resourceId);
}
