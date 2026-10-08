# Ticket: Remove fallback + keys polish

Parent: [Wayfinder map: complete branding, theme, site identity](156-branding-theme-identity-map.md)
Labels: wayfinder:task
Status: done
Blocked-by: (none — frontier)

## Question

Make Remove on every logo/favicon/icon slot reliably clear to default (no broken preview, no stale `<img>`) and fix `BRAND_KEYS` drift (`brand_deep/accent/ink` in defaults but missing from keys)?

## Decision needed

- Empty-string contract across form, `/api/brand`, header/footer/preloader/manifest.
- Keys list as single source (derive from defaults vs manual list).


Resolution: BRAND_KEYS synced with defaults, Remove writes empty string, all consumers fall back to Logo//icon.svg with no broken img. Live: clean revert verified.
