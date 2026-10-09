# Ticket: Brand-bound booking documents

Parent: [Wayfinder map: Unified venue booking](202-venue-booking-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How do booking confirmations and invoices render in the global brand kit
(colors, logo) through the existing pdf-lib renderer family?

## Constraints

- Global kit only (no per-profile themes); reuse bill renderers, not a new
  document engine.

## Resolution

Booking confirmations in the global kit, no new engine:
- `confirmationDoc` (venue name, dates, guest, pay-at-venue memo, zero
  totals — no money moves online) rendered by the shared pdf-lib bill
  renderer with business header + brand color.
- Download rides the public human gate (captcha cookie) with team fallback;
  anonymous without it gets 401. Link on the booking success screen.
Live proof: 200 application/pdf, %PDF- magic, 1 page; gate matrix verified
(401/200). Probe rows deleted by captured ids.
