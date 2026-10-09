# Ticket: Global spacing radius shadow tokens

Parent: [Wayfinder map: Design tokens, kitchen display, access model](198-tokens-kitchen-access-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How do spacing, radius, and shadow join the brand kit as global tokens
(applied live, saved per scope) without touching component code?

## Constraints

- Same pattern as palette prefs: validated values, CSS vars, instant apply.
- No per-page overrides (CMS identity unstable — later ticket).

## Resolution

Global shape tokens on the palette pattern, zero component changes:
- `brand_radius` (0–24px), `brand_shadow` (none/soft/medium/strong),
  `brand_space` (4–16px unit) with pure validators + tests, defaults in
  BRAND_DEFAULTS/KEYS, Tailwind `rounded-brand`/`shadow-brand`/`spacing-brand`
  mappings, scope-respecting live apply in BrandTheme, settings section
  with a token-driven live preview.
- Component adoption is future work (per-page overrides need stable CMS
  identity — still fog, as ticket scoped).
Live proof: API serves defaults, saved values round-trip, branding tab
renders the section. Probes cleaned.
