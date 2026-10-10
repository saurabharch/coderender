# Ticket: i18n foundation Hindi plus English

Parent: [Wayfinder map: SEO, fonts, icons, i18n](216-seo-fonts-i18n-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How do versioned JSON dictionaries, locale routing, an explicit switcher
with remembered choice (location as hint only), and flagged-off RTL land
without touching every string at once?

## Constraints

- `locales/en|hi.json` versioned; admin locale/mode/RTL controls.
- Chrome/navigation first; content translation stays out (dictionaries only).

## Resolution

English+Hindi foundation, dictionaries versioned, content untouched:
- `locales/en|hi.json` (36 keys each, parity-tested) + pure helpers
  (normalize, fallback, dir gate, IN→hi hint).
- Cookie-remembered switcher, server lang/dir from cookie → hint → site
  default; header/footer/nav chrome translated; RTL stays flagged off.
- Owner controls for site default locale + RTL flag.
Live proof: Hindi cookie renders all 8 spot-checked strings server-side;
admin controls render; English unchanged. Probes cleaned.
