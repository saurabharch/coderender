# Ticket: Installment schedules + allocation

Parent: [Wayfinder map: Installment schedules for dues](183-installment-map.md)
Labels: wayfinder:task
Status: brief
Blocked-by: (none — frontier)

## Question

How are dated installment slices created per debtor, and how does each
collection allocate oldest-first across slices while the balance stays the
single source of truth?

## Constraints

- Slices sum to a plan, never exceed balance; allocation is pure + tested.
- `collectUdhari` keeps working untouched; schedules record alongside.
