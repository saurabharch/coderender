# Ticket: i18n foundation Hindi plus English

Parent: [Wayfinder map: SEO, fonts, icons, i18n](216-seo-fonts-i18n-map.md)
Labels: wayfinder:task
Status: brief
Blocked-by: (none — frontier)

## Question

How do versioned JSON dictionaries, locale routing, an explicit switcher
with remembered choice (location as hint only), and flagged-off RTL land
without touching every string at once?

## Constraints

- `locales/en|hi.json` versioned; admin locale/mode/RTL controls.
- Chrome/navigation first; content translation stays out (dictionaries only).
