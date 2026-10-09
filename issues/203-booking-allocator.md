# Ticket: Authoritative booking allocator

Parent: [Wayfinder map: Unified venue booking](202-venue-booking-map.md)
Labels: wayfinder:task
Status: brief
Blocked-by: (none — frontier)

## Question

How does every booking pass one atomic overlap check (half-open intervals
for stays, slot/buffer rules for halls) so double-booking is refused at
write time?

## Constraints

- Pure interval math + tests (half-open stays, buffers, capacity);
  SQLite transaction around check-then-insert.
- One allocator for staff, public, and table-linked bookings alike.
