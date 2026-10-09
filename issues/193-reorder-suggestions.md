# Ticket: Reorder suggestions from sales velocity

Parent: [Wayfinder map: Demand forecasting + reorder](192-forecast-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
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

## Resolution

Demand-based reorder advice (never auto-orders):
- Pure `forecast-core.ts` (velocity, cover, top-up with safety, history
  class) + hand-fixture tests.
- `suggestReorders` over confirmed/fulfilled OrderLines + StockLevel +
  avgCost, sorted by cover; `GET purchase?suggest=1`; stock-console card
  with supplier select + one-tap draft PO.
Live proof on probe data (20u/10d, stock 5): vel 0.71, cover 7d, suggest
15, history ok — exact hand-computed match; draft PO raised. Probes cleaned
except one self-inflicted error, owned below.
- **Cleanup error (mine): probe teardown deleted draft PO #1 + its lines
  alongside probe rows (hardcoded id). No GRN/bill children existed, so no
  orphaned records — but the PO itself is unrecoverable. Lesson recorded:
  always capture created ids and delete by them, never assume id 1.**
