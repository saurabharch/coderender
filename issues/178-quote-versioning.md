# Ticket: Quote versioning and acceptance

Parent: [Wayfinder map: NexoPOS advancement on current infra](173-nexopos-advance-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How do quotes gain versions, approval, and acceptance distinct from orders
and invoices — building on `ShopOrder` + `BillDoc` + the CRM quotation stage?

## Constraints

- Quote ≠ order ≠ invoice stays a data truth, not just UI wording.
- Acceptance mints an order; never mutates the quoted version.

## Resolution

Quote is now data truth, distinct from orders and invoices:
- `Quote` + versioned `QuoteLine` tables; versions append-only, quoted rows
  never mutated; pure `quoteCan` status machine + tests.
- Flow draft→sent→approved→(accepted|expired), rejected/expired/cancelled
  terminal; acceptance mints a live `ShopOrder` (channel quote, linked both
  ways) and refuses on price drift with "revise first".
- API `/api/shop/quotes` (list/get/create/revise/status/accept) + Quotes
  card in shop-console (builder, version history, flow buttons, accept).
Live proof (QT-00001): v1 kept after v2 revision; draft accept refused;
drifted price refused; restored price minted order #40 linked both ways.
All probe rows cleaned.
