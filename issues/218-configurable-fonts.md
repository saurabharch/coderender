# Ticket: Configurable fonts

Parent: [Wayfinder map: SEO, fonts, icons, i18n](216-seo-fonts-i18n-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How do display/body font stacks become settings-configurable (including
Devanagari-capable families) without breaking the live type system?

## Constraints

- Extend FONT_STACKS + picker, never replace the token flow; build-time
  fonts only (no runtime font downloads).

## Resolution

Seven regional stacks + latin-ext, same token flow:
- Noto Devanagari/Bengali/Tamil/Telugu/Kannada/Gujarati/Naskh-Arabic at
  build time; Inter/Archivo gain latin-ext (French/German/Dutch/Tagalog).
- FONT_STACKS + live theme map + picker extended; validation unchanged.
Live proof: font vars in served CSS/HTML, indic round-trips the brand API,
picker lists the stacks. Probes cleaned.
