# Ticket: Admin plan offer editor (Mantine)

Parent: [Wayfinder map: Sellable plans (configurable prices, cart, checkout)](227-sellable-plans-map.md)
Labels: wayfinder:task
Status: doing
Blocked-by: [Ticket: Plan price model (labels, offer, badge)](228-plan-price-model.md)

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
