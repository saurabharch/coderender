# Ticket: POS receipt width + logo

Parent: [Wayfinder map: POS advance on current infra](163-pos-advance-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — graduated from triage)

## Question

How does the POS customer copy print correctly on 58/72/80mm thermal paper
with the brand logo, through the browser dialog on current infra?

## Decision

- `receipt_width` pref (58|72|80, default 72) in Business profile (prints on
  bills) + `parseReceiptWidth` pure in `lib/retail-core.ts` (tested).
- Receipt API adds `meta {width, logo}`; `PosReceipt` uses width in `@page
  size` + container + centered logo line. No ESC/POS (no infra).


Resolution: receipt_width pref (58|72|80, default 72) in Business profile + parseReceiptWidth pure/tested; receipt API meta {width, logo}; PosReceipt @page size + width + logo line. Live: width select renders with saved 58, receipt route healthy, probes cleaned.
