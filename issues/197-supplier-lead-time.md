# Ticket: Supplier lead-time learning

Parent: [Wayfinder map: Demand forecasting + reorder](192-forecast-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How is per-supplier lead time learned from PO-to-GRN lags and shown where
reorders are raised?

## Constraints

- Pure average over received POs (latest 10 per supplier); suppliers with
  no receipts report honestly as unknown, not zero.
- Display-only advice on the reorder card; never auto-adjusts quantities.

## Resolution

Learned lead times from PO-to-GRN lags:
- Pure `meanLeadTime` (latest 10 receipts, unknown-not-zero) + tests.
- `supplierLeadTimes()` + `?leadtime=1` endpoint + lead chips in the
  reorder-card supplier picker (display-only advice).
Live proof: probe supplier with a 3-day PO→GRN lag reported exactly 3 days.
Probe rows deleted by captured ids (lesson applied).
