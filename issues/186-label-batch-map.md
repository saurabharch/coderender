# Wayfinder map: Label batch queue

Labels: wayfinder:map
Status: doing

## Destination

Multi-SKU label batches: queue products with per-item copies, print one
combined sheet/roll run on current print CSS. Done when a mixed batch
prints correctly with chain green and CI green.

## Notes

- Domain: extends the per-product label studio (presets + paper engine
  already live); batch is queue + combined layout, not a new engine.
- Skills every session: `implement` + `tdd`; `code-review` before release.
  No new infra; browser print only.
- Constraints: npm on-device; never `pm2 restart` on red build; probe cleanup.

## Decisions so far

<!-- one line per closed ticket, gist + link -->

## Not yet specified

- Saved server-side label templates (preset per shop, shared across devices).

## Out of scope

- PDF label export (no PDF engine); raw printer protocols (no infra).

## Children

- [Multi-SKU label batch queue](187-label-batch-queue.md) — frontier
