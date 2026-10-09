# Ticket: Authoritative booking allocator

Parent: [Wayfinder map: Unified venue booking](202-venue-booking-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How does every booking pass one atomic overlap check (half-open intervals
for stays, slot/buffer rules for halls) so double-booking is refused at
write time?

## Constraints

- Pure interval math + tests (half-open stays, buffers, capacity);
  SQLite transaction around check-then-insert.
- One allocator for staff, public, and table-linked bookings alike.

## Resolution

One atomic allocator for every booking kind:
- Pure half-open interval math + buffers + conflict search (tested,
  including back-to-back-free and fail-closed invalid ranges).
- `Booking` table + `placeBooking` with BEGIN IMMEDIATE check-then-insert;
  conflicts refuse as 409s, cancels free the slot.
- Team-gated `/api/bookings` (book/cancel/list).
Live proof: hall booked, overlap refused 409, back-to-back accepted.
Probe rows deleted by captured ids.
