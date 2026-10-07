# Ticket 133-draft-reservations

Status: done
Labels: plan06, inventory, correctness

Plan §21/37-39: drafts hold stock (reserve → release → out), expiring holds
auto-release. Legacy drafts (no reserve moves) keep exact current behavior.

- [x] createOrder reserves physical lines (ref order#id-reserve) + event trail.
- [x] Confirm: release outstanding reserves, then issue full lines.
- [x] Cancel draft: release outstanding + free coupon (existing).
- [x] reservationTick(48h) + scheduler hook + reservedQty on product page.
- [x] Live: draft→reserve, confirm→release+out, cancel→release, expiry, legacy.
- [x] Chain green + release.
