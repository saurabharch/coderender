# Plan 06 coverage → app (P1 §1-64 / P2 modules / P3 final arch / P4 seeds+rules)

Legend: ✅ done · 🟡 partial · ⬜ todo. Evidence = file/symbol. Deliberate
differences from the plan are marked (SQLite-native, no rewrite).

## Catalog & variants (P1 §1-5, §12-18 / P3 §6-10)
- Product/variant/SKU/barcode split (§1, MOD-5/7/10): ✅ Product/Variant/Barcode tables, lib/commerce.ts + lib/barcode.ts.
- Prisma schema enums (§2, MOD-4/5): 🟡 tables mirrored, app enums stay string unions (native, zero codegen).
- Dynamic attrs color/size/weight/length/volume (§3, MOD-9): ✅ attrs JSON {kind,value,unit,color,size}, ticket 131.
- Barcode system + check digits (§5, MOD-10): ✅ validate/generate/assign/lookup/quick-create, lib/barcode-core.ts.
- Variant matrix + exclusions + auto-SKU (§14-17, IMPL-47): 🟡→✅ matrix UI ticket 132; SKU `P{id}-{C3}-{SIZE}`.
- Images/media (§11): ✅ MediaAsset + R2 mirror + bg-remove jobs.
- Brand/category + custom attrs (§12-13, MOD-7/8): ✅ category/subcategory/brand-ish + specs JSON.

## Inventory (P1 §6-11, §20-22 / P2 MOD-8-15 / rules 5-6)
- Warehouses/stores/bins (§6, MOD-4): ✅ Warehouse + BinLoc.
- Levels as materialized snapshot, moves immutable (§7-8, rules 5-6): ✅ StockLevel + StockMove (append-only; no UPDATE path).
- Batches/FEFO/expiry (§9, MOD-13): ✅ lots + cost/sell + lotPrice + expiry watch.
- Serials (§10, MOD-15): ✅ table + receive/sell (ticket 105-107 era).
- Reservation (§21, IMPL-37-39): 🟡 moves exist (reserve/release kinds), NOT wired to draft orders (confirm issues directly). → next slice.
- Multi-channel stock (§22): 🟡 channel toggles; single pooled ledger (deliberate).

## Purchasing (P1 §15-17 / MOD-16-18)
- PO → GRN → bill → pay (§15-18): ✅ inventory.ts + finance bridge.

## Sales & pricing (P1 §18-27 / MOD-17-24)
- Tier/quantity pricing (§18, §24): ✅ ProductPrice + minQty + resolvePrice.
- Bundles/composite/BOM (§19, §48-49): 🟡 ProductExt kinds exist; no BOM explosion. → later.
- Cart/quote (§21): ✅ quote() + channel/cgroup resolution.
- Discounts/coupons (§25): ✅ flat/pct/caps/windows + manual override (flag-gated).
- GST tax engine (§26): ✅ CGST/SGST/IGST, inclusive/exclusive.
- Invoice numbering + immutability (§27-28, rule 8): ✅ prefixed docs; 🟡 immutability by status (no edits past paid — verify before claiming hard).
- Order FSM (§20): ✅ draft→confirmed→fulfilled→cancelled/returned, atomic confirm.
- Khata/credit (§31): ✅ udhari dues + collect.
- Subscriptions/digital/service (§45-47): 🟡 kinds + skip-stock; no billing cycles.

## POS (P1 §32-37 / MOD-21 / IMPL-65-66,72)
- Counter/scan/tender/change/receipt/CRN (§32, §26-txn): ✅ tickets 119-130.
- Drawer session (§33-34): ✅ DrawerDay open/settle (day granularity, deliberate).
- Split payment (§30): ⬜ single method per sale. → next slice.
- Offline/outbox/idempotency (§35-37, IMPL-59-60): 🟡 idempotency keys on pay intents; no offline queue. → later.

## Money & accounting (P1 §38-42 / MOD-23)
- Ledger/bank moves (§38-40): ✅ BankTx + ledgerPost; 🟡 single-sided (plan wants double-entry — deliberate, note openly).
- Returns + restock decision (§41-42): ✅ returned/rto statuses + sale-return moves.
- Refunds as new records (rule 10): ✅ recordPayment negative/new-row path (verify on use).

## Platform (P1 §50-56 / MOD-1-3 / IMPL-61-64,67-71,80-82)
- Lifecycle/audit/RBAC/metrics/reports/search/indexes: ✅ audit(), RBAC matrix, BI hub, FTS/search, indexes.
- API standards/versioning/errors (§45-46, IMPL-80-81): 🟡 zod + consistent {ok/error}; no version prefix, ad-hoc codes.
- Soft delete (§82): 🟡 status-archived for products; hard deletes on variants/lots/slides.
- Money helper (§83): ✅ paise-int convention + mask/toPaise.
- Tx boundaries/events/concurrency (§67-69, TEST-78): ✅ atomic confirm; no long txns (deliberate).

## UI (IMPL-72-76): ✅ consoles + detail tabs + label studio + receipt print.
## Seeds/tests (IMPL-76-79): 🟡 live API probes per ticket; no static seed pack, no matrix doc.

## Next slices (in order)
1. #133 reservations on drafts (expiry + release paths).
2. #134 split payments (POS composer + posSale[] + receipt).
3. #135 bundles/BOM explosion (if a real bundle need appears — else skip).
