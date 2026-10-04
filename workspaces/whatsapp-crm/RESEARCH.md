# WhatsApp CRM deep dive (DeskcommCRM → CodeRender)

Source: melgarafael/DeskcommCRM (Next.js App Router + Supabase/Postgres, Portuguese-language
ops tool). Studied: app/ (admin/public/team routes), workers/ (ai-response, ai-sentiment +
handoff, rag-indexer, media persist/derive, lgpd export/redact, storage-cleanup, voice-agent),
loop/ (INBOX/LOOP/RUN + checkpoints test automation), triagem/ (triage doctrine, 181KB),
supabase/ (2.4MB baseline schema), server/client/media/auth/i18n analogues already covered
by BTST-parity work (issues 050–074).

## Reference architecture (what they do)

- **Conversations, not messages**: everything hangs off a conversation/contact record
  with timeline activities; messages are events inside it.
- **Event-log dispatcher**: versioned handlers (`key`, `events[]`, `ok/skipped`) consume a
  durable event log — retries and audits fall out naturally.
- **Triage doctrine (triagem)**: classify → sentiment-score → route: bot answers, low
  sentiment → human handoff with reason, orders (pedidos) get a dedicated pipeline.
- **Workers per concern**: ai-response, ai-sentiment (+pedidos variant), media persist vs
  derive (store original, render derivatives), RAG indexer, LGPD export/redact,
  storage cleanup, voice agent. Each handler is independently testable.
- **Loop automation**: INBOX → LOOP → RUN markdown protocol with checkpoints — the
  agentic dev loop, mirrored locally by our issues/ + scripts/status.py + ci.sh.
- **Media two-stage**: persist original, derive optimized copies (we already do the
  library half; derivation is the gap).

## Our gap (CodeRender today)

| Capability | Reference | Us | Gap |
|---|---|---|---|
| Conversation inbox | contact timeline | flat WaMessage log | **no inbox, no contact record** |
| Outbound reply from UI | agent + templates | API-only send | **no reply console, no templates** |
| Sentiment → handoff | score + orchestrator | abuse block only | **no sentiment, no auto-ticket** |
| Broadcasts/campaigns | scheduler + entrypoint | one-off notify | **no campaign runner** |
| Opt-out/STOP | LGPD flows | none | **no opt-out store** |
| Media derivation | derive worker | originals only | thumbnails on demand (defer) |
| Loop tests | loop/ protocol | vitest pure + live smoke | extend loop: webhook→reply→ticket |

## Out of scope (honest)

- Running their stack here (Supabase/Postgres, bun/turbo, asterisk VoIP, voice
  agent, RAG embeddings service): none viable on Android/Termux. We port the
  **semantics** (inbox, triage, handoff, loop tests) onto SQLite + our Job queue.
- Asterisk/telephony and voice: no provider, no hardware path — documented gap.

## Build order (tracer bullets)

1. **075**: inbox core — WaContact + conversation view, reply box (Cloud API),
   templates CRUD + variable send, opt-outs, sentiment→ticket handoff worker.
2. **076**: campaigns — broadcast runner on Job queue with pacing + STOP respect.
3. **077**: loop tests — webhook→reply→ticket automation + regression script.
