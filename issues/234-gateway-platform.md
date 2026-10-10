# Ticket: Gateway platform (test/live creds, settings tab, subscribe idempotency)

Parent: [Wayfinder map: Sellable plans (configurable prices, cart, checkout)](227-sellable-plans-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How do all payment credentials become configurable per-environment
(test + production) in a Settings payment-gateway tab, and how does a
plan subscribe stay idempotent end to end?

## Constraints

- Vault-first (AES-sealed `ProviderCred`, env fallback, masked render);
  per-provider MODE test/live selecting key sets; honest "keys missing"
  states, never silent failures. No live key ever logged.
- `PayIntent.ikey` UNIQUE is the idempotency spine:
  `plan_{pkg}_{lead}_{period}` — retries return the same intent, webhooks
  confirm via `confirmIntent` (paid-twice impossible).
- Claim before work; full gate green; live-prove with test-mode creds.

## Resolution

Vault-first test/live credentials with per-provider MODE (test default)
in a Settings Payments tab; `/api/pay/subscribe` mints lead → draft
ClientOrder → idempotent PayIntent (`plan_pkg_lead_period`) → provider
payload. Live proof: 4 rapid subscribes → exactly 1 lead/order/intent;
resume returns honest 422 (never 500 — a missing catch on the resume
branch was found live and fixed); unauth vault writes 401; probes cleaned
by captured ids, dummy vault keys cleared.
