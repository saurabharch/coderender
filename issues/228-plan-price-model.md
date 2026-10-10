# Ticket: Plan price model (labels, offer, badge)

Parent: [Wayfinder map: Sellable plans (configurable prices, cart, checkout)](227-sellable-plans-map.md)
Labels: wayfinder:task
Status: done
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

## Resolution

`ServicePackage` gains priceLabel/mrp/offerMode/offerValue/offerLabel/
badge (ALTER-TABLE migration, Prisma mirrored, seeds untouched — no fake
offers). Pure `planEffective` math in `lib/catalog-core.ts` (5 tests):
flat/pct clamped, mrp struck only when honestly above charge, charge is
always the single basis accounting keeps. `getPlan` backfills honest
defaults on old rows; create/update accept + normalize all six fields.
Live proof: temp plan (20% off 10000, mrp 15000) → charge 8000, struck
15000, 47% off → row deleted by captured id; existing plans read clean
defaults. Unblocks Admin offer editor, Card redesign, Commerce bridge.
