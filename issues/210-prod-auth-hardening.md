# Ticket: Production auth hardening + dev-bypass switch

Labels: wayfinder:task
Status: doing
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
