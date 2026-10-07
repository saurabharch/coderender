# Ticket 138-subscriptions

Status: done
Labels: plan06, billing, recurring

Suggestion order #3. Recurring billing: subscribe → daily tick bills due
cycles into confirmed orders + pending payments + notify. No auto-collection
(no rails) — cashier collects via POS/udhari. Honest scope, stated in UI.

- [x] CustomerSub table + subscribe/renew-now/cancel + subTick.
- [x] API /api/shop/subscriptions + Billing card.
- [x] Scheduler daily hook (day-guarded).
- [x] Live: subscribe → due → tick → order + notify → cancel verify + release.
