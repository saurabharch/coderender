# Wayfinder map: Unified venue booking

Labels: wayfinder:map
Status: done

## Destination

One booking solution for any customer and any property — hotels, banquet/
marriage/party halls, resorts, service apartments, rooms — online and
offline in the same app, brand-bound, with restaurant table booking linked
in. Done when a customer can book a hall online and staff can run it
offline-first, each live-proved with chain green and CI green.

## Notes

- Domain: profiles = venue kinds sharing one allocator; public storefront
  + staff console are both first-class (not staff-only). Restaurant tables
  reuse DineTable/KotTicket (ticket 200), linked from bookings.
- Skills every session: `implement` + `tdd`; `code-review` before release.
- Constraints: npm on-device; Prisma migrate Linux-only; never `pm2 restart`
  on red build; probe cleanup; manual payments (UPI/cash) until gateway keys.

## Decisions so far

- [Authoritative booking allocator](203-booking-allocator.md): atomic overlap refusal live-proved (409 + back-to-back).

## Not yet specified

- Approval queues per venue; recurring reservations; deposits/policies
  engine (cancellation/no-show rules).
- Offline booking sync protocol (outbox pattern exists for POS sales only).

## Out of scope

- OTA/channel-manager integrations; supplier marketplace; AI decisions.
- Online payment capture (no gateway keys); guaranteed conflicts across
  disconnected devices.

## Children

- [Authoritative booking allocator](203-booking-allocator.md) — done
- [Venue models + admin console](204-venue-models.md) — done (profiles + rates + allocator link live-proved)
- [Public book flow](205-public-book-flow.md) — done (hold-to-confirm cycle live-proved)
- [Brand-bound booking documents](206-booking-brand-docs.md) — done
