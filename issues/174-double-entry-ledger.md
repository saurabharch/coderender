# Ticket: Double-entry ledger adoption

Parent: [Wayfinder map: NexoPOS advancement on current infra](173-nexopos-advance-map.md)
Labels: wayfinder:task
Status: brief
Blocked-by: (none — frontier)

## Question

Adopt double-entry journals (reversing the recorded single-sided decision)
via additive tables + a backfill writer with dual-run proof — or keep
single-sided and reject plan §1/§67?

## Constraints

- Existing ledger rows immutable; migration only adds.
- `ledgerPost` keeps working during dual-run; cutover only with TB that balances.
- Trial balance + P&L fall out of the journals or the ticket fails.
