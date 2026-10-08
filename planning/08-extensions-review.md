# Mantine extensions review (2026-10-08, package @mantine 9.7.x)

Source: https://mantine.dev/x/extensions/ (official + community lists).

## Already adopted (official, admin-scoped CSS in mantine-shell)
- core, hooks, form, dates, charts, notifications, spotlight, carousel,
  dropzone, modals, nprogress, lightbox, tiptap, code-highlight.
- Covers every official extension we have a use for.

## Deliberately NOT adopted
- Community visual packages (Book, Parallax, Scene, Marquee, Flip,
  TextAnimate, Reflection, BorderAnimate, Mask, DepthSelect, LensSelect):
  decorative weight with no dashboard job; each adds bundle + CSS surface
  that risks token clash on Termux builds. Rejected.
- DataTable / MantineReactTable / ListViewTable: our data-table + kanban
  board-views already cover filter/sort/facets with project tokens. No dup.
- QrCode: we render QR via the `qrcode` lib (labels, POS collect). No dup.
- Onboarding tour: nice-to-have; admin is learned in one session. Deferred.
- Gantt: board-views ships its own lightweight Gantt (no drag-reschedule
  needed). Deferred until drag editing is requested.
- Audio/Video/Window/Map/Choropleth/TreeSelect/etc: no matching feature.
- tiptap official: installed but CKEditor stays the editor (AGENTS.md: no
  editor duplication).

Rule: a new extension needs a job no current primitive does, admin-scoped CSS,
and a passing Termux build. Revisit per ticket, not per release.
