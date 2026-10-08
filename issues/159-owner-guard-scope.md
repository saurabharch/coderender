# Ticket: Owner-only guard + scope enforcement

Parent: [Wayfinder map: complete branding, theme, site identity](156-branding-theme-identity-map.md)
Labels: wayfinder:task
Status: done
Blocked-by: (none — frontier)

## Question

Restrict Branding & Theme to owner role and prove scope (public/dashboard/both) applies without leaking dashboard theming or breaking public pages?

## Decision needed

- Guard shape (`requireTeam` → owner check) for tab + `saveBrand`.
- Scope proof matrix (public vs admin BrandTheme).


Resolution: saveBrand owner-only, branding tab hidden + redirected for non-owners, BrandLogo/Preloader respect dashboard scope. Live: staff sees no branding UI.
