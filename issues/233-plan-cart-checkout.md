# Ticket: Plan cart + checkout with totals, tax, coupons, ledger

Parent: [Wayfinder map: Sellable plans (configurable prices, cart, checkout)](227-sellable-plans-map.md)
Labels: wayfinder:task
Status: doing
Blocked-by: [Ticket: Package-to-commerce bridge (plans become orderable)](231-package-commerce-bridge.md), [Ticket: Admin-controlled checkout fields](232-checkout-fields-setting.md)

## Question

How do plans sell end to end — persistent cart icon + drawer surviving
refresh, checkout showing plan totals + tax + coupon, order posting to
bills/payments/ledger — reusing the existing engines?

## Constraints

- Cart icon button with count + drawer (survives refresh; server-side
  `Cart` vs ephemeral state decided here — never localStorage-as-DB).
- Checkout reuses `couponOff`/`quoteCart`/`splitTax`, `createOrder`,
  `billFromOrder`, `recordPayment`; plan-aware totals preview before
  submit; COD/UPI/manual only (gateway capture is fog).
- Claim before work; live-prove a real plan purchase to ledger
  (Dr==Cr) with probes cleaned by captured ids; full gate green.
