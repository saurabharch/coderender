# Ticket: Receivables aging, terms, write-off

Parent: [Wayfinder map: NexoPOS advancement on current infra](173-nexopos-advance-map.md)
Labels: wayfinder:task
Status: brief
Blocked-by: [Ticket: Double-entry ledger adoption](174-double-entry-ledger.md)

## Question

How do udhari balances gain terms, aging buckets, statements, and
write-offs on top of the (possibly new) journal structure?

## Constraints

- Reads existing `Customer.credit/balance` first; no parallel truth.
- Write-off needs owner perm + audit trail, never silent mutation.
