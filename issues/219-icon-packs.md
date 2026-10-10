# Ticket: Icon packs with toggle

Parent: [Wayfinder map: SEO, fonts, icons, i18n](216-seo-fonts-i18n-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How do icon packs (lucide default + at least one alternate set) become
toggleable in settings with instant apply?

## Constraints

- One icon interface; no per-file icon rewrites beyond the adapter.
- Toggle is instant and scoped like the rest of the kit.

## Resolution

Toggleable glyph packs behind one adapter, no icon-dep added:
- `soft` alternates for all 30 nav/vertical/service/tool keys with
  key-parity tests; `packMaps()` resolution; validated pref.
- `PackIcon` client adapter (classic SSR fallback, swaps on kit load);
  all 6 consumer surfaces migrated (home, industries, services, header
  menus, stacked cards); settings radio + save path.
Live proof: soft flows through the brand API; classic renders server-side
by default. Probes cleaned.
