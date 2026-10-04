# Infra mega-program — PRD + phased tickets

Status: done
Labels: epic

## PRD (one page)

**Goal.** Enterprise-grade messaging + billing + automation on the Termux
device, with Linux-deploy parity — without breaking a single live flow.

**Principles.** Native-first (zero new native deps), provider-abstracted
(Cloud API | WAHA | off), device-honest UI (unconfigured states, never fake
success), secrets in vault or env (never chat, never git), every flow
smoke-tested live before merge.

## Tickets

- [x] 077 WAHA switch: `wa_provider` pref (cloud-api|waha|off), REST client
  (start/status/QR/logout), dashboard QR + disconnect + session-clear,
  kill switch respected by sender + webhook.
- [x] 078 Workflow builder: node canvas, triggers (manual/ticket/lead),
  channel steps (wa/email/telegram/slack), enable/disable, per-channel
  kill switches, queue execution, run log.
- [x] 079 Webhook delivery (Svix-like): endpoint registry + secrets,
  HMAC-signed sends, idempotency, retry scheduler, replay, rate limits,
  logs UI, OpenAPI entries.
- [x] 080 Payments: Razorpay orders + signature + webhook e2e; PayU +
  Easebuzz hash flows + vault fields; invoice linkage; fixture tests.
- [x] 081 Deploy pack: docker-compose (postgres/redis/app/worker) for
  Linux, termux service defs, CI/CD wiring, release + deploy verify.

## Step-by-step opencode prompts (per ticket)

1. `Read issues/07X + RESEARCH2.md, implement backend first (lib + API),
   then UI, then tests, then chain (lint/typecheck/test/build).`
2. `Smoke every endpoint live (200s + rows), clean test data, commit,
   sync.sh, verify public URL.`
3. `If a native dep or daemon is required, stop and report — do not fake it.`
