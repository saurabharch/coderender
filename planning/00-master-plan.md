# 00 — CodeRender master plan

Source: BBuilder `planning/` shape, scoped to the coderender agency site.

## Destination
Pixel-adapted agency site `coderender`: `/` (mbgcard.in section order), 10× `/industries/[slug]`, `/tools/gbp-booster-whatsapp-ai-agent`, `/about /careers /pricing /contact`, `/api/leads` → SQLite. Responsive 375/768/1280, light/dark/system theme, mobile-only quick-action bar.

## Order
1. Reference breakdown (researcher): grill mbgcard.in + gmb.digitalmbg.com + grexa.ai into `workspaces/coderender/` — no verbatim copy.
2. Offers + copy (offer-architect): ladder, catalog, per-vertical SEO copy from `templates/offers/` + `templates/gtm/landing-page-copy.md`.
3. Scaffold + design system (launcher + prototype): Next.js, shadcn/Radix, next-themes, Inspo-backed sections.
4. Leads (automation-builder): Prisma `Lead`, `/api/leads` zod-validated, `scripts/dryrun_lead_intake.py` parity.
5. Launch (launcher): `templates/launch/launch-checklist.md` 100% before ship.

## Binding constraint
Unfilled reference breakdown + unbuilt gold path (`/` → industry → `/contact` → 200). Fix first.
