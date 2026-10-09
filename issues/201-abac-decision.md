# Ticket: ABAC vs coarse roles decision

Parent: [Wayfinder map: Design tokens, kitchen display, access model](198-tokens-kitchen-access-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

Adopt resource-level access control (migrate every gate) or keep the 9+1
role matrix — decided by evidence, not preference?

## Constraints

- Survey every gate call-site first; the decision must name the migration
  cost honestly. Keeping roles requires writing down why (recorded).

## Resolution: KEEP the 9+1 role matrix, ABAC rejected with reasons

Evidence (counted, not felt):
- 111 API routes gate through three centralized choke points
  (`sessionUser` login, `shopGate` team/API-key, `scaleGate` settings) —
  only 9 files touch `hasPerm`/`requireScope` directly.
- All checks resolve through one `MATRIX` in `lib/scale-core.ts` plus a
  handful of explicit owner-only writes (branding, write-off, bonus award
  list) — no scattered string-role logic to migrate.
- ABAC would mean a policy table plus touching all 111 routes and the
  drawer for delegation granularity no flow has ever needed (owner →
  manager → staff covers every verified path, including impersonation).
Cost far exceeds any demonstrated need; revisit only with a concrete
delegation request that roles cannot express.
