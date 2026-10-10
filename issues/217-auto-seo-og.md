# Ticket: Auto SEO, OG images, blog fields

Parent: [Wayfinder map: SEO, fonts, icons, i18n](216-seo-fonts-i18n-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How do meta tags, OG images (with brand logo), and blog slug/excerpt
generate automatically from title + brand kit?

## Constraints

- OG via framework image routes (no new engine); logo/colors from live prefs.
- Slug/excerpt derive on save when blank, never overwrite explicit values.

## Resolution

Discoverability on autopilot, all settings-driven:
- Home + per-post OG image routes (brand colors/name live from prefs),
  wired into root + post metadata with twitter large-image cards.
- Blog save derives the excerpt from the body when left blank (never
  overwrites explicit values); post descriptions fall back the same way.
- Caught live: satori demands explicit flex on multi-child divs (post OG
  crashed the connection until fixed); verified byte-valid PNGs both routes.
