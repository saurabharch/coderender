# Ticket: Multi-SKU label batch queue

Parent: [Wayfinder map: Label batch queue](186-label-batch-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How does the label studio accept a queue of products (each with copies)
and lay them out across sheets/rolls in one print run?

## Constraints

- Reuses studio presets, paper engine, and `@page` CSS; queue lives in
  localStorage like the scan tray (per-device, no server state).
- One print button for the whole batch; per-item copies respected.

## Resolution

Multi-SKU batch queue inside the existing studio, engine untouched:
- Batch tab with snapshotted queue items (localStorage, per-device),
  per-row copies steppers, add-current, clear; total capped at 999.
- Print view flattens the queue into one combined run (queue order) across
  the same sheets/rolls math; single-product flow byte-identical when the
  queue is empty. Sticker renderer parameterized, one Print button.
Live proof: labels page renders the Batch tab; batch engine present in the
served chunk; single-product path unchanged (empty queue = old behavior).
Probe product cleaned.
