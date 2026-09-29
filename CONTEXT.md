# CONTEXT.md — coderender shared language

Single source for domain terms. Challenge terms against this file; update it inline when meaning shifts.

## Glossary
- **Industry vertical**: one of the 10 Grexa-style pages (`salon-owners` … `handyman-services`). All share `/industries/[slug]` template, differ only in copy/SEO metadata.
- **Featured tool**: `GBP Booster - WhatsApp AI Agent` at `/tools/gbp-booster-whatsapp-ai-agent`.
- **Offer ladder**: entry (audit/sprint) → project (fixed scope/date) → retainer. Loud, confident commitments live in `templates/offers/` + `workspaces/coderender/`.
- **Lead**: Prisma `Lead { name, phone, businessType, source, message, createdAt }` written via `/api/leads`. Never localStorage, never log-only.
- **Reference breakdown**: section-by-section grill of `mbgcard.in` / `gmb.digitalmbg.com` / `grexa.ai` (layout, rhythm, animation, copy intent) stored in `workspaces/coderender/`. Rewrite copy, rebuild assets locally; no hotlinking, no verbatim paste.
- **Gold path**: `/` → industry page → `/contact` → `/api/leads` 200. Must work on 375px with theme toggle intact.

## Tracker policy (local files first)
- Now: `issues/` markdown files (`NNN-slug.md`, `Status:` line). States: inbox → brief → doing → done.
- Triage labels: `design`, `offer`, `automation`, `proof`, `chore`.
- A2A envelopes in `.opencode/a2a/tasks/` mirror agent-executable tickets.

## Skill map
- Reference/design: `research` + Inspo MCP + `prototype` for UI variants.
- Offers/copy: `bb-services-offers` + `bb-gtm-30-day` + `bb-market-research` (teardowns).
- Build: `tdd`, `diagnosing-bugs`, `code-review`, `implement`, `to-spec`, `grill-with-docs`.
- Automation/leads: `bb-workflow-automation` (n8n later, test instance first).

## Decisions (newest last)
- 2026-09-29: ported BBuilder kit (`skills/`, `templates/`, `.opencode/agents`, `scripts/`, A2A) into coderender; BBuilder issues/tasks not carried over.
