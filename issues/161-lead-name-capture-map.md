# Wayfinder map: real lead names from chat + finish previous plans

Labels: wayfinder:map
Status: done

## Destination

The sales agent captures the lead's real name (never stores display fallback
"friend" as data) across split replies, and prior maps' leftovers are closed
or explicitly deferred. Done when a name-only-then-contact chat yields a Lead
with the real name, plus chain green + live proof.

## Notes

- Domain: see CONTEXT.md (Lead name, Brand kit, Theme scope, Site identity).
- Skills every session: `implement` + `tdd`; `diagnosing-bugs` for the parse
  trace; `code-review` before release.
- Execution override: this map carries implementation (user asked for a
  working fix, not spec-only).
- Constraints: `honorific.ts` stays pure (vitest cannot import node:sqlite);
  name parsing lives there, sqlite reads stay in `identity.ts`/`agent-net.ts`.
- Never `pm2 restart` on a red build; probe threads/leads cleaned after live proof.

## Decisions so far

- [Agent stores real lead name, never friend](162-agent-lead-name-friend-fallback.md): parse + preserve + no-friend-persist, live-proved.

## Not yet specified

- Prior-plan leftovers beyond the name bug (map 148 responsive sweep scope,
  plan-08 Phase 2+ token engine, font uploads, white-label): graduate after
  the name fix lands, one ticket at a time.

## Out of scope

- Statutory engines, customer storefront bar, full OPD dashboard (per map 148).
- Page builder / theme marketplace (plan-08 Phase 4-6).

## Children

- [Agent stores real lead name, never friend](162-agent-lead-name-friend-fallback.md) — done
