# Ticket: Recurring series + occurrence control

Parent: [Wayfinder map: Recurring reservations + approvals](207-recurring-approvals-map.md)
Labels: wayfinder:task
Status: brief
Blocked-by: (none — frontier)

## Question

How do weekly/monthly series expand into allocator-checked occurrences
with skip/cancel per occurrence and the series surviving partial conflicts?

## Constraints

- Each occurrence passes the same atomic check (partial success reports
  which dates took and which refused — never silent skips).
- Cap series length (e.g. 52) against runaway expansion.
