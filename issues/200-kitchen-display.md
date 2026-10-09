# Ticket: Kitchen display + table orders

Parent: [Wayfinder map: Design tokens, kitchen display, access model](198-tokens-kitchen-access-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How do restaurant tables fire orders to a kitchen display screen with a
visible status loop (fired → preparing → ready), web-only?

## Constraints

- Screen route + polling (existing stack, no sockets infra assumed).
- No printer routing (no print-bridge host); KDS states stay basic.

## Resolution

Web-only kitchen loop, no printer paths:
- `DineTable` (name/seats/status/captain) + `KotTicket` (no/lines/captain/
  server/firedBy) with pure `kotCan` machine + tests; empty tickets and
  illegal jumps refused.
- Fire snapshots names/prices and defaults captain from the table; serving
  the last open ticket frees the table.
- API `/api/dine` (tables/tickets/fire/move) + Dine floor page + Kitchen
  display page (15s polling, big-type cards, one-tap advance) + drawer
  entries with icons.
Live proof: table → fired KOT-00001 → preparing → ready → served, table
free again, both pages 200. Probe rows deleted by captured ids.
