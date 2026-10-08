# Ticket: Responsive sweep level 2 (device render)

Parent: [Wayfinder map: finish plans, todos, phases, tasks, issues; responsive UI everywhere](148-wayfinder-finish-all.md)
Labels: wayfinder:task
Status: brief
Blocked-by: (none — frontier, HITL: needs human hardware)

## Question

On real hardware at 375px (phone), 768px (tablet), and 1280px (desktop),
does every admin route stay usable — no horizontal overflow, tap targets
≥44px, drawer reachable, POS counter + sale + receipt printable?

## Checklist (owner runs on the public URL)

1. Phone 375px: open `/admin/pos`, add an item, complete a cash sale, print
   the receipt. Drawer opens via the mobile toggle.
2. Tablet 768px: walk `/admin/orders`, `/admin/shop`, `/admin/billing`.
3. Desktop 1280px: walk `/admin/settings?tab=business`, `/admin/people`.
4. Report any clipped/overflowing/untappable element per route.

## Notes

Level 1 (static: 41/41 routes 200, viewport meta, nav markers, no fixed
widths) already passed in [Responsive sweep level 1](169-responsive-sweep-L1.md).
No desktop browser exists on the build machine, so this level cannot be
agent-run. Failures graduate as fix tickets.
