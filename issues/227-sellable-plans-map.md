# Wayfinder map: Sellable plans (configurable prices, cart, checkout)

Labels: wayfinder:map
Status: doing

## Destination

Plans & services sell end to end like e-commerce: every plan shows a
configurable price block (price labels, optional flat/% offer with
struck-through previous price + shimmer "new/offer" highlight), and any
visitor can add plans to a persistent cart and check out with a minimal
details form — totals, tax, coupons posting into the existing accounting
(ledger, bills, payments) as one unified system.

## Notes

- Stack rules win over requests: Mantine stays **admin-scoped** (its CSS
  mounts only under `/admin` via `MantineShell`; AGENTS.md). So the offer
  toggle/editor lives in Mantine, but public pricing/cart/checkout cards
  use shadcn/Radix + the existing `beam`/`glass` idiom — same look, no
  token clash. Owner may override explicitly.
- Real data only; no hardcoded plan content. `ServicePackage` is the
  single price truth; `prisma/schema.prisma` mirrors `lib/store.ts`
  (Linux deploys only). No `localStorage` as DB — cart persistence is a
  ticket question, not an assumption.
- Execution (per Notes override): repo controller dispatches workers
  serially; one ticket per session; live-prove before close. Skills:
  `implement`, `tdd`, `code-review`; `grill-with-docs` for the card
  redesign; `mantine-form` for the admin editor.
- Skills available: implement, tdd, code-review, grill-with-docs,
  mantine-form, prototype.

## Decisions so far

<!-- one line per closed ticket, gist + link -->

- (none yet — frontier is Plan price model + Checkout field requirements)

## Not yet specified

- Guest vs logged-in cart identity; cart merge on login.
- Retainer (`/mo`) plans at checkout: one-time first charge vs BizSub minting.
- Gateway capture (PayIntent/PayLink) vs manual UPI/COD for plan orders.
- Package-specific coupons vs shared coupon pool; HSN/GST rate per plan.
- `site_prices` ladder vs `ServicePackage` — converge or keep both.

## Out of scope

- (none ruled out yet)
