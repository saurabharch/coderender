# Wayfinder map: Demand forecasting + reorder

Labels: wayfinder:map
Status: done

## Destination

Never stock out blind: per-product daily demand from order history,
reorder points with safety cover, and a suggested purchase list. Done when
suggestions match hand-computed math on probe data with chain green and CI
green.

## Notes

- Domain: builds on OrderLine history + StockLevel + Supplier/PurchaseOrder
  tables; math pure and tested, advice labeled as advice (never auto-order).
- Skills every session: `implement` + `tdd`; `code-review` before release.
- Constraints: npm on-device; never `pm2 restart` on red build; probe cleanup.

## Decisions so far

- [Reorder suggestions from sales velocity](193-reorder-suggestions.md): hand-matched math + draft PO live-proved.

## Not yet specified

- Auto-raised purchase orders (needs approval flow first).
- Supplier lead-time learning: done (GRN timestamps existed after all).

## Out of scope

- ML forecasting services (moving average suffices at this scale).
- Auto-ordering without human approval.

## Children

- [Reorder suggestions from sales velocity](193-reorder-suggestions.md) — done
