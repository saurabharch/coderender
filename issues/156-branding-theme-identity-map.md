# Wayfinder map: complete branding, theme, site identity

Labels: wayfinder:map
Status: done

## Destination

Branding & Theme in Settings is complete and owner-only: full brand kit + site identity (name/tagline/keywords/description) + favicon + loading icon, scoped public/dashboard/both, with upload/remove falling back to defaults and live metadata/manifest. Done when an owner can set, scope, remove, and see it applied without broken previews.

## Notes

- Domain: see CONTEXT.md (Brand kit, Theme scope, Site identity, Remove/fallback).
- Skills every session: `implement` + `tdd` for builds; `code-review` before release; `diagnosing-bugs` if live contradicts green build.
- Execution override: this map carries implementation (user asked for working feature, not spec-only).
- Constraints: npm on-device; `node:sqlite` runtime; never `pm2 restart` on red build; mobile 375/768/1280, 44px targets; RBAC still gates access.
- Source plan: `planning/08-master-theme-branding.md` (Phase 1 only for this map).

## Decisions so far

- [Ticket: Site identity + SEO metadata](157-site-identity-seo.md): identity fields + dynamic metadata/manifest.
- [Ticket: Favicon + loading icon](158-favicon-loading-icon.md): favicon/loading slots + scoped preloader.
- [Ticket: Owner-only guard + scope enforcement](159-owner-guard-scope.md): owner-only tab/save, scope respected.
- [Ticket: Remove fallback + keys polish](160-remove-fallback-polish.md): keys synced, empty-string fallback everywhere.

## Not yet specified

- Full token engine (spacing/radius/shadow/component tokens, per-page/section overrides, draft/publish/versioning) — Phase 2+ of plan 08, fog until Phase 1 lands.
- Font uploads / variable fonts / pairing presets — fog until identity + scope are solid.
- Multi-tenant / white-label scoping — fog, single-org now.

## Out of scope

- Page builder, templates marketplace, per-component Elementor clone (plan 08 Phase 4-6) — needs token engine + CMS identity first; fresh effort.
- Statutory engines, customer storefront bar, full OPD dashboard (per map 148).

## Children

- [Site identity + SEO metadata](157-site-identity-seo.md) — done
- [Favicon + loading icon](158-favicon-loading-icon.md) — done
- [Owner-only guard + scope enforcement](159-owner-guard-scope.md) — done
- [Remove fallback + keys polish](160-remove-fallback-polish.md) — done
