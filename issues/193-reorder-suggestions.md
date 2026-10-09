# Ticket: Reorder suggestions from sales velocity

Parent: [Wayfinder map: Demand forecasting + reorder](192-forecast-map.md)
Labels: wayfinder:task
Status: brief
Blocked-by: (none — frontier)

## Question

How are per-product daily velocity, days-of-cover left, and reorder
quantities computed from OrderLine history — and where do suggestions
surface for approval?

## Constraints

- Pure math module (velocity, cover, suggested qty with safety days),
  tested against hand-computed fixtures.
- Suggestions are advice: one-tap creates a draft purchase order, never
  an approved one. Slow/no-history products report honestly, not zero.
