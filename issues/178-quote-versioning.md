# Ticket: Quote versioning and acceptance

Parent: [Wayfinder map: NexoPOS advancement on current infra](173-nexopos-advance-map.md)
Labels: wayfinder:task
Status: brief
Blocked-by: (none — frontier)

## Question

How do quotes gain versions, approval, and acceptance distinct from orders
and invoices — building on `ShopOrder` + `BillDoc` + the CRM quotation stage?

## Constraints

- Quote ≠ order ≠ invoice stays a data truth, not just UI wording.
- Acceptance mints an order; never mutates the quoted version.
