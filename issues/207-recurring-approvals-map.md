# Wayfinder map: Recurring reservations + approvals

Labels: wayfinder:map
Status: doing

## Destination

Repeat bookings without repeat data entry: series with weekly/monthly
rules, per-occurrence visibility, skip/cancel without breaking the chain,
plus a light approval step for venues that require it. Done when a series
books cleanly around conflicts with chain green and CI green.

## Notes

- Domain: builds on the atomic allocator (one rule per occurrence, same
  409 honesty) and venue models; approvals are per-venue opt-in flags.
- Skills every session: `implement` + `tdd`; `code-review` before release.
- Constraints: npm on-device; never `pm2 restart` on red build; probe cleanup.

## Decisions so far

<!-- one line per closed ticket, gist + link -->

## Not yet specified

- Deposits/cancellation-fee policies (money rules — needs fee table first).
- Series editing semantics beyond skip/cancel (edit-one vs edit-all).

## Out of scope

- OTA/channel sync; auto-approval bots; payment capture at booking.

## Children

- [Recurring series + occurrence control](208-recurring-series.md) — frontier
- [Venue approval queues](209-approval-queues.md) — frontier
