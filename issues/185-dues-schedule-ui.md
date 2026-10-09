# Ticket: Dues UI: pay-part + schedule view

Parent: [Wayfinder map: Installment schedules for dues](183-installment-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: [Ticket: Installment schedules + allocation](184-installment-schedules.md)

## Question

How do dues rows show the schedule (slices, paid/pending) and take a
part-payment that lands on the oldest open slice?

## Constraints

- Builds on the dues card + statement page patterns; 44px targets.
- Server re-validates everything (client schedule is display only).

## Resolution

Schedule visibility where dues are worked:
- Dues rows carry the open plan (id + paid/total slices chip) + a Pay plan
  button that lands part-payments oldest-first; server re-validates.
- Statement page gained an installment-plans section (slices with paid
  progress) from live plan data.
Live proof: probe debtor with a 2-slice plan showed plan 0/2 in the dues
row and the full schedule on the statement page. Probe rows cleaned.
