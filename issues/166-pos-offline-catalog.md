# Ticket: POS offline catalog fallback

Parent: [Wayfinder map: POS advance on current infra](163-pos-advance-map.md)
Labels: wayfinder:task
Status: brief
Blocked-by: (none — frontier)

## Question

Which POS lookups (product search, scan add, held list, bill quote) get cached
fallbacks so a sale can complete fully offline and sync via the existing
outbox + `ikey` dedup?

## Decision needed

- Cache shape + freshness (cached catalog vs live quote math).
- Conflict honesty: what the cashier sees when offline totals differ.
