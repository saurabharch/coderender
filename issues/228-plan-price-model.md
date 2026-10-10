# Ticket: Plan price model (labels, offer, badge)

Parent: [Wayfinder map: Sellable plans (configurable prices, cart, checkout)](227-sellable-plans-map.md)
Labels: wayfinder:task
Status: doing
Assignee: opencode
Blocked-by: (none — frontier)

## Question

What columns does `ServicePackage` gain so every plan can carry a
configurable price block, and how do they migrate on-device + Linux?

## Constraints

- Single-price `price` stays the charge basis (accounting untouched).
- New: `priceLabel` ("actual/total/price" text), `mrp` (compare-at,
  optional), `offerMode` (off/flat/pct), `offerValue`, `offerLabel`
  ("offer/discount price" text), `badge` (none/new/offer/new-price text).
  Effective price is pure math (test in `-core`, Vitest-safe).
- `lib/store.ts` ALTER-TABLE pattern + `prisma/schema.prisma` mirror;
  seeds stay honest (no fake offers). Claim before work.
