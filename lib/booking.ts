// Unified bookings: one allocator for halls, rooms, stays, tables.
// Resources are generic (kind + id); every write passes the atomic overlap
// check — a conflicting booking is refused, never queued silently.
import { getDb } from "./store";
import { findConflict } from "./booking-core";

export function bookingTables(): void {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS Booking (id INTEGER PRIMARY KEY AUTOINCREMENT, resourceKind TEXT NOT NULL DEFAULT 'room', resourceId INTEGER NOT NULL DEFAULT 0, customerId INTEGER NOT NULL DEFAULT 0, name TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', startAt TEXT NOT NULL DEFAULT '', endAt TEXT NOT NULL DEFAULT '', bufferMin INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'confirmed', notes TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL DEFAULT (datetime('now')))`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_booking_resource ON Booking(resourceKind, resourceId, status)`);
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
       WHERE resourceKind=? AND resourceId=? AND status NOT IN ('cancelled')`).all(kind, input.resourceId) as
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

export function cancelBooking(id: number): void {
  bookingTables();
  getDb().prepare("UPDATE Booking SET status='cancelled' WHERE id=?").run(id);
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
