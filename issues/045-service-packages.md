# Service packages + GBP audit tables in answers

Status: done
Labels: feature

## Question
Bot names services but never shows packages, inclusions, related stack, or GBP audit points.

## Done when
- `ServicePackage` table seeded per service (DB = source of truth, admin-editable).
- Product answers attach package tables + related stack + GBP audit table when asked.
- Comparisons use live package rows. Chain green + smoke.
