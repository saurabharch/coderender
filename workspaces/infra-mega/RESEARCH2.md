# Mega-infra research, part 2 (DeskcommCRM docker + Autumn + Bigcapital)

## What the references actually are

- DeskcommCRM `docker-compose.prod.yml`: Postgres + Redis + app + workers on
  x86/cloud VMs. Needs dockerd + kernel namespaces — **absent on Termux**
  (verified: no docker, no termux-services, no redis/psql binaries).
- Autumn (useautumn): bun/turbo monorepo, Stripe-backed billing cloud.
  Self-hosting it here is infeasible; correct pattern is API passthrough
  (already stubbed as `autumnMirror`) + native ledger as source of truth.
- Bigcapital (develop): Express + Postgres accounting. Same verdict:
  port the **vocabulary** (journals, invoices, receipts, trial balance —
  already in `lib/finance.ts`), not the stack.

## Decision (device-honest enterprise)

| Ask | Verdict |
|---|---|
| Docker aarch64 postgres/redis/inngest/svix | NOT on-device (no dockerd). Native twins: node:sqlite (Postgres seam via Prisma), Job queue + scheduler (Redis/Bull seam), inngest bridge (Cloud when keyed). Docker Compose file provided for Linux deploy. |
| termux-services autostart | Not installed; service definitions shipped, `pkg install termux-services` to enable. pm2 stays the runner. |
| WAHA alternative | Provider switch `cloud-api \| waha \| off` + REST client to user-hosted WAHA_URL; QR/disconnect/session-clear UI with honest unconfigured states. Running WAHA sessions needs Chrome/Docker elsewhere. |
| Svix-like platform | Native subset: endpoint registry, HMAC-signed deliveries, idempotency, retry via Job queue, replay, rate limits, logs UI, OpenAPI. |
| Razorpay/PayU/Easebuzz | Razorpay end-to-end (orders + signature + webhook); PayU/Easebuzz hash flows + vault; keys pending. |
| Workflow builder (all channels) | Visual node canvas (no deps): triggers (manual, ticket/lead events) + channel actions (wa/email/telegram/slack-team) + enable/disable + per-channel kill switches. |
| Autumn billing | Event mirror stays; native invoices remain source of truth. |

## Phases (tickets)

- 077: WAHA switch + QR/disconnect/session UI.
- 078: workflow builder MVP (triggers + channel steps + kill switches).
- 079: webhook delivery core (endpoints, signing, retries, replay, logs).
- 080: payments (Razorpay e2e, PayU/Easebuzz hash flows, vault, tests).
- 081: deploy pack (compose file, termux service defs, CI/CD wiring).
