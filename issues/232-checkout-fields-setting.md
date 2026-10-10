# Ticket: Admin-controlled checkout fields

Parent: [Wayfinder map: Sellable plans (configurable prices, cart, checkout)](227-sellable-plans-map.md)
Labels: wayfinder:task
Status: doing
Blocked-by: (none — frontier)

## Question

Which customer fields does checkout ask for, and how does the admin
dashboard control what is required?

## Constraints

- New `checkout_fields` Preference (JSON: field → off/optional/required)
  + settings UI; enquiry `name+phone` stay the floor (lead integrity),
  never weakened. Checkout validates with zod; minimal by default.
- Today this toggle does not exist (lead-schema hardcodes) — so this
  ticket also decides whether enquiry forms adopt the same setting later
  (fog, not this ticket).
