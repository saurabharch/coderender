# Ticket: Recurring series + occurrence control

Parent: [Wayfinder map: Recurring reservations + approvals](207-recurring-approvals-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How do weekly/monthly series expand into allocator-checked occurrences
with skip/cancel per occurrence and the series surviving partial conflicts?

## Constraints

- Each occurrence passes the same atomic check (partial success reports
  which dates took and which refused — never silent skips).
- Cap series length (e.g. 52) against runaway expansion.

## Resolution

Repeat bookings without repeat data entry:
- Pure `expandSeries` (weekly days/monthly date, overnight rollover,
  capped, invalid→[]) + tests.
- `bookSeries` places each occurrence through the atomic allocator and
  reports booked[] + refused[] with reasons — never silent partials.
- API `series` op + series panel in the venue detail (day toggles, until).
Live proof: middle Saturday pre-blocked → 2 booked + 1 refused with the
slot-taken reason. Probe rows deleted by captured ids.
