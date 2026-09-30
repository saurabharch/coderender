# AI platform: gateway + agent network + isolation + infra bot

Status: done
Labels: feature

## Question
AI chat needs secure local inference, scoped agents, tenant isolation, and infra reporting.

## Done when
- `lib/ai-gateway.ts`: ONLY inference chokepoint (scopes support/product/pricing/
  partner/infra; PII redaction; opencode CLI via pty in empty sandbox dir, 100s cap;
  provider fallback; every call audited to AiAudit). Verified live: grounded pricing
  reply, runtime opencode-cli, eval 80.
- `lib/agent-net.ts`: router + support/product/pricing/partner agents + tools
  (briefing, pricing, own-threads), AgentKit-shaped for later swap. /api/chat and
  durable triage run through it; thread ownership enforced (403 otherwise).
- Isolation rules: allowlist login, per-user threads, redacted prompts, server-side
  keys only, audit trail. Documented below.
- Infra bot (`lib/infra.ts`): disk/db/build/scheduler checks hourly + on demand;
  trouble → team notification + owner mail.
- Blockers recorded honestly: @inngest/agent-kit needs zod-v4 (deferred), BTST
  proper device-blocked, provider keys unset (gateway falls back to template).
