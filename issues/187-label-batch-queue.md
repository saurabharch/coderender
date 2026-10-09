# Ticket: Multi-SKU label batch queue

Parent: [Wayfinder map: Label batch queue](186-label-batch-map.md)
Labels: wayfinder:task
Status: brief
Blocked-by: (none — frontier)

## Question

How does the label studio accept a queue of products (each with copies)
and lay them out across sheets/rolls in one print run?

## Constraints

- Reuses studio presets, paper engine, and `@page` CSS; queue lives in
  localStorage like the scan tray (per-device, no server state).
- One print button for the whole batch; per-item copies respected.
