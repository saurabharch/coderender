# Ecom / Business-OS build plan (existing stack only)

Source: `planning/01-master-plan-ecom.md` (50 domains → 15 suites → 5 levels).
Rules: reuse existing modules/pipeline (no duplicates); native stack
(node:sqlite, Job queue, vault, session + `cr_` key scopes); WooCommerce-style
REST resources gated by user auth (team session / roles) + service auth
(API key scopes `shop:read` / `shop:write` / `admin`).

## Coverage map (every domain → ticket; ✓ = exists, → = extended, + = new)

| Suite | Domains | Ticket |
|---|---|---|
| Catalogue & Product | 3 catalogue→, 4 units+, 1 packages✓ | 085 |
| Sales & POS | 20 orders→, 5 pricing/payments→, 21 POS-lite+ | 085 (+089 POS counter) |
| Customers & CRM | 19 CRM→, 27 leads✓, 25 loyalty+ | 085 lite → 088 full |
| Subscription & Billing | 2 plans✓, 23 invoicing→ | 085 coupons/tax → 087 docs |
| Payments & Collections | 5 gateways✓, 16 revenue✓, 35 banking+ | 087 |
| Inventory & Warehouse | 6, 8, 7 transit-lite | 086 (+089 ship) |
| Procurement & Suppliers | 9→, 22 | 086 |
| Logistics & Delivery | 7, 32 channels-lite | 086 core → 092 |
| Finance & Accounting | 14→, 13 expenses/assets+, 36 planning+ | 087 → 091 |
| HR & Workforce | 17→, 18 timesheets+ | 091 |
| Marketing & Loyalty | 11✓, 26 automation+, 31 reviews→ | 089 (loyalty in 088) |
| Brand & Digital Commerce | 15→, 32 marketplace, 40 docs✓ | 092 |
| Automation & Integrations | 38 flows✓, 42 api✓, 43 import/export+ | 092 |
| AI Copilot | 44✓, 45 agents→, 46 KB✓ | 092 gap-close |
| System | 41 RBAC→, 47 audit→, 48 notify✓, 49 settings✓, 50 cockpit→ | 088 cockpit → 092 RBAC/audit |

Levels: L1 Solo = 085 (+existing); L2 Growing = 086–089; L3 Multi-branch = 090–091;
L4 Scaled = 092; L5 Marketplace = 092 channels.

## Phase A — 085 commerce-foundation (this build)
Tasks: units table + conversions (core-tested); tax engine (GST-ready CGST/SGST/IGST
split, inclusive/exclusive); coupons (flat/%/caps/window/per-customer); customers
(groups/tags/credit); products (variants/attributes JSON, media, SEO, status);
cart quote (price → discount → tax → total); orders (draft→confirmed→fulfilled→
cancelled + returns, timeline events, stock decrement hook); shop key scopes;
`/admin/shop` console; OpenAPI entries; fixture tests.
Reuse: Service/Package catalog untouched; ClientOrder/Payment/ledger/Offer/notify.

## Phase B — 086 inventory-procurement
Stock ledger (in/out/adjust/transfer/reserve), low-stock alerts → notify, warehouses/
bins, suppliers + PO → GRN → invoice → payable, batch/expiry lite.

## Phase C — 087 money-docs
Invoice/proforma/estimate/credit-note/receipt/challan numbering + PDF-print view +
email/WhatsApp send; banking/cash/UPI accounts + transfers + reconciliation;
refunds/partial via gateway + ledger; expenses + assets + depreciation lite.

## Phase D — 088 crm-loyalty
Lead→Loyal pipeline stages on Customer, activity timeline, segments, CLV,
birthday/win-back flows wiring; loyalty points/tiers/rewards + referral rewards;
reviews/testimonials moderation + alerts; owner cockpit attention feed (50).

## Phase E — 089 marketing-pos-logistics
Campaigns (email/WA/push + coupons) on flows engine; abandoned-cart recovery;
POS counter (quick sale, hold/resume, cash drawer open/close, day settlement);
shipments (create/track/status/RTO-lite) + delivery zones/rules.

## Phase F — 090 services-branches
Service catalogue→booking→job-card→invoice chain on existing appointments;
staff assignment; multi-branch (pricing/stock/staff scoping); print templates.

## Phase G — 091 people-planning-bi
Employees/departments/payroll/payslips/loans; attendance/timesheets/leave;
budgets + cash-flow forecast + margins; BI command-center page (37).

## Phase H — 092 scale-platform
Marketplace/channel order centralize; franchise onboarding/royalty;
RBAC enforcement (manager/sales/cashier/inventory/accountant/hr/marketing roles);
audit log + login history; CSV import/export (products/customers/stock/opening);
AI agents gap-close (inventory/procurement/finance questions on new tables).
