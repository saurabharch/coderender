# Wayfinder map: finish plans, todos, phases, tasks, issues; responsive UI everywhere

Status: doing
Assignee: opencode

## Destination

Zero open issues, zero unchecked boxes, every planning doc mapped to shipped
work or an explicit deferral — with every admin route verified usable at
375px/768px/1280px. Done when `grep -L 'Status: done' issues/` is empty AND a
responsive sweep of all admin routes passes.

## Notes

- Skills: `implement` + `tdd` for builds; `code-review` before release.
- Verify chain per ticket: lint + typecheck + tests + build, then live curl
  proofs + probe cleanup. Never `pm2 restart` on a red build.
- Mobile-first: 44px targets, wrap-not-squeeze rows, scrollable tables.

## Decisions so far

- [Responsive sweep level 1](169-responsive-sweep-L1.md): 41/41 drawer routes 200, viewport meta, nav markers, zero fixed widths — no failures.
- [Planning-doc mapping](170-planning-doc-mapping.md): all 15 planning docs shipped or explicitly deferred; zero unchecked boxes; deliberate partials documented.

- Ticket 147 (recruit pipeline + training): closed, v0.71.0. Duplicate tone keys caused a red typecheck mid-ticket; fixed before build.

## Not yet specified

- HR leftovers: exception engine + hire/exit audit verified present in code; only bonuses missing → [Staff bonuses through payroll](179-staff-bonus-payroll.md).
- Level 2 device render lives in [Responsive sweep level 2](171-responsive-sweep-L2.md) — the map's last frontier item.

## Out of scope

- Statutory engines (PF/ESI/PT/LWF/gratuity/TDS): blocked on verified rule tables.
- Customer storefront bar: no customer identity exists.
- Full OPD/clinic dashboard: needs vertical scoping decision.
