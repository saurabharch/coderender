# Visual pass (static, honest) + token auth + real prices + proof + sessions

Status: done
Labels: feature, security

## Question
Desktop-browser screenshots unavailable (no browser connected); API keys unenforced;
prices hard-coded DRAFT; testimonials hard-coded placeholders; sessions unmanageable.

## Done when
- Visual pass = DOM-level audit (overflow, tap targets, markers) — screenshots
  documented as pending human pass.
- `requireApiKey()` enforced on new POST /api/notify/send (scope notify:write);
  leads/track attribute key source.
- Site prices + testimonials live in DB (admin CRUD); pricing page, calculator,
  agent tool read them.
- Settings lists sessions (revoke) + team roles (owner toggle).
- Test→commit→push→release→deploy in order.
