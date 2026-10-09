# Ticket: Venue approval queues

Parent: [Wayfinder map: Recurring reservations + approvals](207-recurring-approvals-map.md)
Labels: wayfinder:task
Status: brief
Blocked-by: (none — frontier)

## Question

How do venues that require approval hold incoming bookings in pending
until staff approve or decline — without blocking venues that don't?

## Constraints

- Per-venue opt-in flag; pending holds expire like public holds.
- Approve mints the confirmed booking through the allocator (re-checked);
  decline frees the slot with a reason logged.
