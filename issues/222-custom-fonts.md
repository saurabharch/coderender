# Ticket: Custom font uploads, packages, per-language mapping

Parent: [Wayfinder map: SEO, fonts, icons, i18n](216-seo-fonts-i18n-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How do owners upload font files, compose them into named packages, remove
them, and map locales to stacks — all validated and live-applied?

## Constraints

- Uploads: woff2/woff/ttf/otf only, size-capped, stored in media library;
  `@font-face` URLs restricted to site uploads + https.
- Packages = named family lists; mapping = locale → stack id served via the
  brand API for the i18n ticket to consume.
- Remove deletes cleanly (no orphan references in picker/mapping).

## Resolution

Owner-controlled type beyond the 11 built-ins:
- Upload woff2/woff/ttf/otf (≤5MB, magic-verified, media library) with
  family naming; list with live preview + remove (also resets selection).
- Custom stacks merge into the picker; save validates against built-ins +
  uploaded families; per-locale stack map served via the brand API for i18n.
- BrandTheme injects @font-face (uploads/https only) and applies custom
  selections with the same scope rules.
Live proof: fake file 422s; real Mukta TTF stored, selected, mapped, and
rendered in the tab; all probe prefs/assets/rows cleaned.
