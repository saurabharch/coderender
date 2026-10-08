# Ticket: Favicon + loading icon

Parent: [Wayfinder map: complete branding, theme, site identity](156-branding-theme-identity-map.md)
Labels: wayfinder:task
Status: done
Blocked-by: [Ticket: Site identity + SEO metadata](157-site-identity-seo.md)

## Question

Add favicon + loading-icon slots to the kit so tab icon, Apple touch, manifest, and Preloader follow branding with default fallback?

## Decision needed

- Slot keys (`brand_favicon`, `brand_loading_icon`) + sizes/hints.
- Preloader + `icons` metadata + manifest wiring when empty vs set.


Resolution: brand_favicon + brand_loading_icon slots, metadata icons + manifest wiring, Preloader uses loading icon with dashboard-scope respect. Live: API round-trip + empty fallback.
