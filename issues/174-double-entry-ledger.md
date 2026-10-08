# Ticket: Double-entry ledger adoption

Parent: [Wayfinder map: NexoPOS advancement on current infra](173-nexopos-advance-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

Adopt double-entry journals (reversing the recorded single-sided decision)
via additive tables + a backfill writer with dual-run proof — or keep
single-sided and reject plan §1/§67?

## Constraints

- Existing ledger rows immutable; migration only adds.
- `ledgerPost` keeps working during dual-run; cutover only with TB that balances.
- Trial balance + P&L fall out of the journals or the ticket fails.

## Resolution: ADOPTED — and already true

Evidence reversed the premise: every `ledgerPost` already writes equal
debit + credit legs (one row, both sides), `trialBalance()` nets both sides,
CoA is seeded, P&L renders. The plan-06 "single-sided" note described row
shape, not unbalanced books — no migration needed, nothing rewritten.
Delivered instead (same files, zero behavior change):
- Pure `lib/finance-core.ts` (legs map, trial arithmetic, balance check) +
  3 unit tests; `finance.ts` delegates to it.
- Live proof on demo DB: 25 entries, total Dr == total Cr (7,178,600).
  Watch item: `suspense` carries most volume (adjust/expense kinds) — future
  cleanup, not this ticket.
This unblocks [Receivables aging, terms, write-off](175-receivables-aging.md).
