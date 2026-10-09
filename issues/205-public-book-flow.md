# Ticket: Public book flow

Parent: [Wayfinder map: Unified venue booking](202-venue-booking-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: [Ticket: Authoritative booking allocator](203-booking-allocator.md)

## Question

How does any customer discover availability and book online (search →
quote → hold → confirm, pay at venue / UPI) through the same allocator?

## Constraints

- Abuse/captcha-gated like the public chat; idempotent holds.
- Manual payments only (no gateway); confirmation creates the ledger-safe
  records, never duplicate books.

## Resolution

Public booking for any customer, same allocator:
- Search (kind/text + live busy flags), quote from venue rates, 15-minute
  holds, confirm creating a follow-up lead (no money moves online).
- Captcha gate + rate limits mirroring public chat; lapsed holds read as
  free; confirm on a lapsed hold refuses honestly.
- Public `/book` page with the full flow UI.
Live proof (anonymous + captcha cookie): free → quote → hold → busy →
confirm (booking + lead #27) → gate 403s without the cookie. Probes
cleaned by captured ids.
