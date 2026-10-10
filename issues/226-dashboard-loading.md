# Ticket: Dashboard loading failure

Labels: wayfinder:task
Status: done
Verified: 2026-10-10
Assignee: opencode

## Question

Why does the dashboard not load, and what is the minimal fix that restores
it on every device without regressing the green gate?

## Constraints

- Diagnose against live evidence first (status codes, server logs, failing
  query/component) — no speculative rewrites.
- Real data only; honest failure states over silent blanks.
- Full gate (lint + typecheck + test + build) stays green; live-prove
  before close; probes cleaned by captured ids.

## Findings so far

- Every dashboard route SSR-proves 200 with full content (`/admin`,
  orders, leads, shop, media, ops, tickets, schedule) — no server-side
  loading failure reproducible.
- Real defect found in logs: split-brain `.next` — the running server's
  in-memory webpack runtime required `./chunks/4283.js`, deleted by the
  second of two back-to-back builds. Every 10-min ticket-SLA tick crashed
  (`[sla] Cannot find module`), so SLA escalation was silently dead.
  Same family can 404 chunks on stale tabs (user-side loading spins).
- Healed per runbook: pm2 stop → `rm -rf .next` → clean build (223/223
  green) → start. All routes re-proved 200. Awaiting one scheduler tick
  to confirm the `[sla]` error is gone.

## Resolution

Split-brain `.next` healed per runbook (stop → wipe → clean 223/223
build → start). Proof: all 8 dashboard routes 200 with full content,
error log untouched since the restart (the 10-min SLA tick fired clean —
previously it crashed every cycle), public 200. No source change, so no
release cut; ticket-only commit. If the owner's device still spins, it is
a stale tab holding pre-build chunk hashes: hard-refresh (or close/reopen
the tab — ChunkRecovery self-heals at most twice, then needs a fresh
load). Still broken after that → report the exact URL + what is seen and
this reopens with device evidence.
