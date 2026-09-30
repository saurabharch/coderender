# Enterprise grade + meetings dashboard + drawer nav

Status: done
Labels: feature, security

## Question
Public POSTs lack rate limits; no security headers; meetings invisible in admin;
top-pill nav doesn't scale; overview predates 10 new features.

## Inspo evidence (2026-10-01)
`recommend("Small-business admin dashboard overview…")`: 24 sites, light 75%,
grotesk-sans 54%, warm accents 63%. Applied: airy warm-paper cards, grotesk display
kicker+headline, single warm accent (teal), icon+label stat tiles, 2-col
chart+meetings split. Against the grain deliberately: no illustration flanks
(text-first admin), no blue CTA (teal system).

## Done when
- Rate limits on leads/subscribe/comments/forms; security headers; secure cookies.
- /admin/schedule (upcoming + history, cancel) + overview upcoming block.
- Drawer sidebar nav (responsive); overview redesigned via Inspo study.
- code-review skill pass on the diff. Test→commit→push→release→deploy in order.
