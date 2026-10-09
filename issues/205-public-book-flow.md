# Ticket: Public book flow

Parent: [Wayfinder map: Unified venue booking](202-venue-booking-map.md)
Labels: wayfinder:task
Status: brief
Blocked-by: [Ticket: Authoritative booking allocator](203-booking-allocator.md)

## Question

How does any customer discover availability and book online (search →
quote → hold → confirm, pay at venue / UPI) through the same allocator?

## Constraints

- Abuse/captcha-gated like the public chat; idempotent holds.
- Manual payments only (no gateway); confirmation creates the ledger-safe
  records, never duplicate books.
