# Ticket: Package-to-commerce bridge (plans become orderable)

Parent: [Wayfinder map: Sellable plans (configurable prices, cart, checkout)](227-sellable-plans-map.md)
Labels: wayfinder:task
Status: doing
Blocked-by: [Ticket: Plan price model (labels, offer, badge)](228-plan-price-model.md)

## Question

How does a `ServicePackage` become a line on a `ShopOrder` — given order
lines today require `productId`, quotes read `Product` tax, and packages
carry no taxPct/HSN?

## Constraints

- Decide: package-native lines vs product-bridge rows; where the offer
  (flat/% + MRP) vs coupon discount each apply; tax/HSN source per plan;
  what `per` (one-time vs `/mo`) means at order time. Fulfillment hook
  (job-card/provisioning or Lead pipeline) named, not built here.
- Monotonic, atomic, `ikey`-deduped like `createOrder`; accounting
  (`billFromOrder`, `recordPayment`) must keep working unchanged.
