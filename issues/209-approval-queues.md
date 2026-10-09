# Ticket: Venue approval queues

Parent: [Wayfinder map: Recurring reservations + approvals](207-recurring-approvals-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How do venues that require approval hold incoming bookings in pending
until staff approve or decline — without blocking venues that don't?

## Constraints

- Per-venue opt-in flag; pending holds expire like public holds.
- Approve mints the confirmed booking through the allocator (re-checked);
  decline frees the slot with a reason logged.

## Resolution

Opt-in approvals without blocking open venues:
- `Venue.requireApproval` flag; pending holds block the allocator like live
  holds and lapse the same way.
- Public confirm routes approval venues to pending (with an honest
  awaiting-approval message); `decideBooking` re-checks overlap on approve,
  cancels with a logged reason on decline.
- Venue detail toggle + pending queue with Approve/Decline in the console.
Live proof: pending blocked a team overlap (409), approve→confirmed,
decline→cancelled with reasons logged; lapsed-hold path shares the hold
expiry already proven. Probe rows (incl. auto-made leads) cleaned by ids.
