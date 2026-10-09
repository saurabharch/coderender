# Ticket: Installment schedules + allocation

Parent: [Wayfinder map: Installment schedules for dues](183-installment-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How are dated installment slices created per debtor, and how does each
collection allocate oldest-first across slices while the balance stays the
single source of truth?

## Constraints

- Slices sum to a plan, never exceed balance; allocation is pure + tested.
- `collectUdhari` keeps working untouched; schedules record alongside.

## Resolution

Dated slices over dues balances with oldest-first allocation:
- `DuePlan`/`DueSlice` tables; pure `allocateSlices` (oldest-first, never
  overpays, leftover returned) + tests.
- `planDues` refuses over-balance plans; `payPlan` collects once through the
  single money path then moves slices; closed plans refuse.
- API plan/payplan/plan/plans ops on the credit route.
Live proof: over-balance refused; 3-slice plan paid oldest-first across two
payments (40000 then 50000), auto-closed at zero, closed-plan pay refused.
All probe rows cleaned.
Also shipped in this turn (ordered UI fixes): payroll staged flow now real
(Open run + per-run Pay; the old button blasted through all stages) with a
confirm on pay — live-proved draft→paid; chat bubble/dialog breathing room
on desktop (bottom-8/right-6); hero counter + iPhone mock desktop margins.
