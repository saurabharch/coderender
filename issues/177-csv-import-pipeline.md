# Ticket: CSV import pipeline

Parent: [Wayfinder map: NexoPOS advancement on current infra](173-nexopos-advance-map.md)
Labels: wayfinder:task
Status: brief
Blocked-by: (none — frontier)

## Question

How do products/customers import from CSV with mapping, validation preview,
and rollback — reusing the pure RFC-4180 parser in `scale-core.ts`?

## Constraints

- Preview-before-write; failed rows never half-import (atomic batches).
- Runs in-process (`runLocal`), no new queue infra.
