# WhatsApp CRM inbox (075) — PRD + spec

Status: done
Labels: feature

## PRD

**Problem.** WhatsApp is send-only plumbing: inbound lands in a flat log,
replies need curl, no contact history, no templates, angry customers never
escalate automatically.

**Users.** Team operators answering WhatsApp; clients messaging the business
number; bots drafting replies.

**Non-goals.** Voice/asterisk, RAG embeddings service, running DeskcommCRM
itself, media derivatives (deferred).

## Spec

- `WaContact` {phone PK, name, stopped, sentiment, unread, lastAt}.
  Webhook upserts contact + message; STOP/START (case-insensitive, exact or
  prefixed) flips opt-out, never creates a ticket.
- `WaTemplate` {name unique, body with {{1}} vars, lang, active}.
- Reply: team-only POST, contact must not be stopped, Cloud API first,
  stores `out` row + receipt tracking via existing webhook receipts.
- Sentiment: pure lexical scorer (-1..1); ≤ −0.4 on inbound → auto-ticket
  (subject prefixed, dedup: one open sentiment ticket per contact) +
  team notify. Runs in the webhook path (sync, cheap) — no new worker.
- `POST /api/wa/inbox` team: conversations (contact + last message +
  unread) and `POST /api/wa/reply`, `CRUD /api/wa/templates`.
- `/admin/whatsapp` inbox UI: list + thread + reply + templates + opt-out
  toggle. Unread clears on thread open.
- Loop test: pure (sentiment, template render, triage routing) in vitest;
  integration via live smoke (this session).

## Done when

- Tables + Prisma; webhook enriches contacts; STOP respected end to end.
- Inbox UI sends real replies; templates with variables work.
- Negative inbound opens exactly one ticket + notify; chain green + smoke.
