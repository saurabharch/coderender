# Ticket: Site identity + SEO metadata

Parent: [Wayfinder map: complete branding, theme, site identity](156-branding-theme-identity-map.md)
Labels: wayfinder:task
Status: done
Blocked-by: (none — frontier)

## Question

Add site identity fields (site name, tagline, meta keywords, meta description) to Branding & Theme so public metadata, manifest, and OG tags follow the kit with safe defaults?

## Decision needed

- Field keys + defaults + validation (length caps, keyword parsing).
- Dynamic `metadata`/`manifest` wiring without breaking static export or green build.


Resolution: added site_name/site_tagline/site_description/site_keywords to kit + dynamic generateMetadata/manifest. Live: title follows prefs, reverts on clean.
