# Wayfinder map: Design tokens, kitchen display, access model

Labels: wayfinder:map
Status: doing

## Destination

Brand kit grows global spacing/radius/shadow tokens; restaurant tables fire
orders to a kitchen display screen; the ABAC-vs-roles question is settled
with reasons. Done when each lands live-proved with chain green and CI green.

## Notes

- Domain: CONTEXT.md stays the glossary; plan-08 Phase 2 is adaptation
  source. KDS is a screen route + order-fire loop (no printer routing).
- Skills every session: `implement` + `tdd`; `code-review` before release.
- Constraints: npm on-device; never `pm2 restart` on red build; probe cleanup.

## Decisions so far

<!-- one line per closed ticket, gist + link -->

## Not yet specified

- KDS advanced states (bump bars, coursing, timers) — after the basic loop.
- Token overrides per page/section (needs stable CMS block identity).

## Out of scope

- KOT printer routing (no print-bridge host); ABAC migration unless the
  decision ticket adopts it; gateway-keyed work (reconciliation, auto-debit).

## Children

- [Global spacing radius shadow tokens](199-design-tokens.md) — frontier
- [Kitchen display + table orders](200-kitchen-display.md) — frontier
- [ABAC vs coarse roles decision](201-abac-decision.md) — frontier
