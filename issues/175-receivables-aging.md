# Ticket: Receivables aging, terms, write-off

Parent: [Wayfinder map: NexoPOS advancement on current infra](173-nexopos-advance-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: [Ticket: Double-entry ledger adoption](174-double-entry-ledger.md)

## Question

How do udhari balances gain terms, aging buckets, statements, and
write-offs on top of the (possibly new) journal structure?

## Constraints

- Reads existing `Customer.credit/balance` first; no parallel truth.
- Write-off needs owner perm + audit trail, never silent mutation.

## Resolution

Shipped as an additive slice on existing udhari balances (no parallel truth):
- `Customer.termsDays` + `balanceSince` columns (ALTER-ADD); stamped/cleared
  on credit-sale/collect/write-off transitions.
- Pure `lib/credit-core.ts` (terms clamp, age/overdue math) + 3 unit tests.
- Statement endpoint (profile + credit orders + timeline).
- Owner-only write-off: atomic balance cut + adjust leg + audit + timeline;
  staff gets an honest 403.
- Dues UI shows overdue badges + Terms + Write off actions.
Live proof on probe debtor (50000, 10d old): 7d terms set, statement read,
owner wrote off 20000 (balance 30000, adjust leg, audit + timeline rows),
staff denied 403. All probe rows cleaned.
Deferred honestly: 30/60/90 aging buckets need invoice-level allocation
(balance is a single number) — future ticket, not this one.
