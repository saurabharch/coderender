# Ticket: Kitchen display + table orders

Parent: [Wayfinder map: Design tokens, kitchen display, access model](198-tokens-kitchen-access-map.md)
Labels: wayfinder:task
Status: brief
Blocked-by: (none — frontier)

## Question

How do restaurant tables fire orders to a kitchen display screen with a
visible status loop (fired → preparing → ready), web-only?

## Constraints

- Screen route + polling (existing stack, no sockets infra assumed).
- No printer routing (no print-bridge host); KDS states stay basic.
