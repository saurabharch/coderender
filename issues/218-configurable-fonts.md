# Ticket: Configurable fonts

Parent: [Wayfinder map: SEO, fonts, icons, i18n](216-seo-fonts-i18n-map.md)
Labels: wayfinder:task
Status: brief
Blocked-by: (none — frontier)

## Question

How do display/body font stacks become settings-configurable (including
Devanagari-capable families) without breaking the live type system?

## Constraints

- Extend FONT_STACKS + picker, never replace the token flow; build-time
  fonts only (no runtime font downloads).
