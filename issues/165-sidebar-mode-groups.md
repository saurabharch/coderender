# Ticket: Sidebar mode-based groups

Parent: [Wayfinder map: POS advance on current infra](163-pos-advance-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How do drawer groups become enable/disable-able globally by business mode
(offline/online/hybrid) on top of industry + role filtering, with Settings UI?

## Decision needed

- Extend `industry_routes` (per-industry href lists) vs new mode→groups map.
- Group regrouping layout (enhanced UI/UX pass on the drawer).
- RBAC stays authoritative; filtering display-only (per `lib/industry.ts`).


Resolution: unified NAV_GROUPS catalog (lib/nav-catalog.ts, pure) drives drawer + industry/mode lists; drawer regrouped to Workspace/Sell/Engage/Plan/Team/System; mode_routes pref + business-tab matrices + resolveVisible intersection in layout. Live: offline filter and industry-minus-pos both proved in drawer HTML, probes cleaned.
