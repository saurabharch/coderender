# Ticket 083-secure-dashboard

Status: done
Labels: feature, security

## Audit (2026-10-05, 99 routes)
- AuthN: partner routes OK (partnerSession), webhooks HMAC-checked, team routes session-gated, public set intentional.
- Holes: OTP + gate PIN have NO attempt cap (6-digit, never-expiring PIN = guessable); no rate limit on
  auth/request, auth/verify, otp, license/verify, push/subscribe, track, chat/vote, chat/threads.
- SQL: clean (parameterized; dynamic fragments from fixed strings only).
- Headers: nosniff/SAMEORIGIN/referrer/permissions present.

## Scope
- [x] OTP + gate PIN: 8-fail lockout (AuthAttempt table), 429s, lockout honored by issue path.
- [x] Rate limits on the 8 unprotected public endpoints above (established clientKey pattern).
- [x] Dashboard UI/UX: shared admin-ui kit (Card/Stat/Empty/Field), overview stat cards,
      drawer active state + grouping, focus-visible rings, console loading/empty states.
- [x] Manifest auth-label audit fixes.
- [x] Chain green, live smoke (429s, lockout E2E, honest states), commit + release.
