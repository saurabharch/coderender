# Wayfinder map: finish plans, todos, phases, tasks, issues; responsive UI everywhere

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

- (pending first resolutions)

## Not yet specified

- Responsive sweep scope: full admin route list + what "passes" means per page.
- HR leftovers: bonus/incentives, payroll exception engine, audit of hire/exit.

## Out of scope

- Statutory engines (PF/ESI/PT/LWF/gratuity/TDS): blocked on verified rule tables.
- Customer storefront bar: no customer identity exists.
- Full OPD/clinic dashboard: needs vertical scoping decision.
