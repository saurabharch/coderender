# Ticket 123-orders-null-prototype

Status: done
Labels: bugfix

`/admin/orders` crashed with null-prototype rows passed to client
`OrdersTable` (one orphaned Payment row was enough to trigger it).
Fixed with deep-plain before the client boundary; sibling pages audited
(leads spreads to plain objects — safe; rest render server-side).

- [x] Deep-plain orders + payments in app/admin/orders/page.tsx.
- [x] Chain green + live 200 with rows present, zero fresh server errors.
