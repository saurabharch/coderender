# Ticket: Production auth hardening + dev-bypass switch

Labels: wayfinder:task
Status: done
Assignee: opencode

## Question

How does magic-link sign-in work in production without leaking usable login
links, while owners keep a passwordless local path — and every role keeps
its configured dashboard?

## Findings (live)

- `devLink` (usable token URL) was returned to ANY requester when SMTP was
  unset — including over the public hostname. Account takeover, zero email
  needed. Fixed before any known abuse (rate logs show only own probes).
- `APP_URL` pointed at localhost:3100, so even mailed links were broken.
- Local and production share one machine AND one database, so neither
  `NODE_ENV` nor a DB pref can tell them apart — fixed by gating on the
  request host (localhost/loopback/LAN, pure + unit-tested).

## Resolution

- Closed the takeover hole: usable login links never leave the server
  except to superadmin emails, with the owner switch on, no SMTP, AND a
  local request host (pure, unit-tested). Production matrix verified live:
  local owner gets one, local staff gets none, public gets none for anyone.
- Fixed production redirects (verify/logout/gcal now use APP_URL, not the
  tunnel-blind request URL) and set APP_URL to the public hostname.
- Owner-only dev-bypass toggle in Settings + honest login copy; role
  dashboards unchanged (RBAC + industry/mode still owner-configured).
- Full production chain: devLink → session → dashboard 200 → settings 200
  with toggle visible. Probe tokens cleaned.
