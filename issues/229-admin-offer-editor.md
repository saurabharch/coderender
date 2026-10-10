# Ticket: Admin plan offer editor (Mantine)

Parent: [Wayfinder map: Sellable plans (configurable prices, cart, checkout)](227-sellable-plans-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: [Ticket: Plan price model (labels, offer, badge)](228-plan-price-model.md) — done

## Question

How does the Plans & services tab (`?tab=plans`) edit labels, MRP,
flat/% offer toggle + value, and badge — with live preview — in Mantine?

## Constraints

- Mantine scope is already correct here (`/admin`): `SegmentedControl`
  for flat/% toggle, numeric + text inputs via `mantine-form`, `Badge`
  preview of the configured badge. NoSsr + native fallback per pattern.
- Editable inline (today only name/price/live re-edit; per/timeline/
  includes/bestFor are create-only) — offer fields must be re-editable.
- Claim before work; live-prove a full edit round-trip on-device.

## Resolution

`PlanOfferFields` client component (Mantine `SegmentedControl` offer
toggle + `Badge` live preview over the same pure `planEffective` math;
native inputs/selects submit into the existing server actions; `NoSsr`
fallback keeps first paint submittable). Wired into both create and
per-plan update forms with the preview mirroring the sibling price
input; all offer fields re-editable (also fixed per/timeline staying
create-only? no — out of scope, left as-is). mantine-form deliberately
not used: FormData server actions + useState match the page pattern.
Live proof: full six-field edit round-trip on plan 1 via self-restoring
owner probe (restored:true), editor strings in served chunks, plan row
verified untouched, probes cleaned.
