# Ticket 129-scan-roles + retail-tabs + save-proof

Status: done
Labels: feature, mobile-first, rbac

- [x] Quickbar save: redirect ?saved=1 + banner; bar refetches on focus.
- [x] Retail ?tab= (marketing/counter/shipments), cards regrouped.
- [x] Role scan routing (tray/detail/HR) + tray → POS preload.
- [x] HR staff lookup (?id= + today attendance) + scan dialog.
- [x] business_type pref + General select + resolver tweak; pos dropped from
      counter-role defaults (tray covers adding).
- [x] Chain green + live verify + release.

Deferred honestly (needs new auth/domain design, not a tweak): customer
storefront bar (no customer identity exists), full OPD/clinic dashboard,
ecommerce storefront changes.
