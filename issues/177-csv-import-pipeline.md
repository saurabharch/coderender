# Ticket: CSV import pipeline

Parent: [Wayfinder map: NexoPOS advancement on current infra](173-nexopos-advance-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How do products/customers import from CSV with mapping, validation preview,
and rollback — reusing the pure RFC-4180 parser in `scale-core.ts`?

## Constraints

- Preview-before-write; failed rows never half-import (atomic batches).
- Runs in-process (`runLocal`), no new queue infra.

## Resolution

Import core already existed (importCsv + previewImport + API); the ticket
closed the three real gaps:
- Preview-before-write UI (valid/invalid/duplicate tallies + problem rows,
  confirm gated on preview).
- Batch tracking (`ImportBatch`/`ImportRow`) + guarded rollback API + batch
  list with Undo buttons. Guards: products need no order lines and no live
  stock; customers need no orders and zero balance. Touched rows are
  reported as skipped, never force-deleted. Double rollback refused.
- Route now returns `batchId` (was computed but dropped from the response).
Live proof: preview flagged the bad row; batch 1 (stocked item) rolled back
0 removed/1 skipped by the guard; batch 2 (zero stock) removed 1. All probe
rows, batches, audit entries cleaned.
