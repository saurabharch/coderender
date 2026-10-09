# Wayfinder map: Saved label templates

Labels: wayfinder:map
Status: doing

## Destination

Label looks that survive devices: named server-side templates (paper +
sticker + content toggles) saved once, applied in one tap in the studio.
Done when a template round-trips server→studio with chain green and CI green.

## Notes

- Domain: extends the studio (per-device localStorage today) and the batch
  queue; templates are shared settings, not per-print state.
- Skills every session: `implement` + `tdd`; `code-review` before release.
- Constraints: npm on-device; never `pm2 restart` on red build; probe cleanup.

## Decisions so far

<!-- one line per closed ticket, gist + link -->

## Not yet specified

- Template sharing across businesses/branches (single-shop first).

## Out of scope

- Visual drag-and-drop designer (fixed smart layout stands).
- PDF label export; raw printer protocols.

## Children

- [Server label templates](191-server-label-templates.md) — frontier
