# Inventory engine plan (from planning/04, mapped to what exists)

Existing (reuse, don't duplicate): EAN-13/ISBN/IMEI/custom validation,
auto internal codes, scan lookup, labels (modes/sizes), CSV import, ledger +
levels + mirror, low-stock alerts, batches, bins, FEFO-ready lots, PO-GRN flow.

## Phase 1 — 105 barcode-engine (this build)
- Barcode table (code, normalized UNIQUE, type incl UPC-A/EAN-8/CODE39/ITF14/
  WEIGHTED/INTERNAL/COUPON/UNKNOWN, product/variant link, primary flag) +
  sequence table for internal codes; migrate existing single codes into it.
- Engine: normalize (strip terminators, keep leading zeros), detect (length +
  checksum, never length-alone), validate → structured result + error codes.
- Endpoints: validate, generate, assign (duplicate-guarded), lookup (single
  indexed query → product + variant + level).
- Quick-create endpoint (zod → normalize → type → validate → dup-check →
  SKU → product + barcode + inventory + OPENING move, one transaction) +
  POS Quick-Add dialog (Mantine modal, type-adaptive fields, Save & Add).
- F2 search / F3 scan / F4 new / ESC close in POS (inputs exempt).
- Generator dialog (type picker + live preview + print) in labels page.
- Label sizes 30×20 / 40×25 / 50×30 / A4-sheet + custom.
- Import: per-row barcode validation, duplicate + invalid + valid counts,
  dry-run preview before commit.
- Serials: table + receive-assign + sell-mark (FIFO), unique constraint.
- Behavior column (stocked/serialized/batch_tracked/service/digital/weighted)
  driving receive/issue paths; service/digital skip stock.
- Expiry alerts in stock tick (<30d → notify once per lot).
- Indexes: barcode/sku/name/product/move refs.
- Mirror reconcile (admin button + function).

## Phase 2 — 106 channels-pricing (next)
ProductChannel (POS/online/marketplace/wholesale), ProductPrice tiers
(MRP/retail/POS/online/wholesale/member windows), FEFO issue, weighted-parse
(20–29 prefix), quote/order price resolution order.

## Phase 3 — 107 gs1-scale (later)
GS1-128/DataMatrix stubs, A4 label sheets, rental/digital/subscription
product extensions, AI categorization hook.
