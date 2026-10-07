# Ticket 127-staff-quickbar

Status: done
Labels: feature, mobile-first, rbac

Staff floating bar (admin, mobile-only): role-based quick actions with center
scan → product detail; customizable per role in Settings → Quick bar.

- [x] GET /api/session (email + role, null-safe).
- [x] GET /api/quickbar (catalog + role defaults + custom pref override).
- [x] Settings 8th tab (Quick bar) with per-role action matrix (server action).
- [x] StaffQuickBar in admin layout; scan center → lookup → detail.
- [x] Chain green + live verify as owner + cashier + release.
