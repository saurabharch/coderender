# Ticket: Venue models + admin console

Parent: [Wayfinder map: Unified venue booking](202-venue-booking-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: [Ticket: Authoritative booking allocator](203-booking-allocator.md)

## Question

How are properties, halls/rooms/stays, capacity, amenities, and rate rules
modeled and managed — covering hotels, banquet/marriage/party halls,
resorts, and service apartments without one oversized form?

## Constraints

- Profile-driven fields (hall vs stay vs room), amenity/capacity filters.
- Links to existing customers, billing, and DineTable where relevant.

## Resolution

Profile-driven venues without the oversized form:
- `Venue` (hotel/hall/resort/apartment/room + capacity/amenities/timings)
  + `VenueRate` (label/amount/unit/minStay); detail API bundles rates with
  live allocator bookings for the venue.
- API `/api/venues` (list/get/save/rate/drop) + Venues admin page with
  expandable rate manager + drawer entry.
Live proof: hall + rate + allocator-linked booking, detail showed both,
page 200. Probe rows deleted by captured ids.
