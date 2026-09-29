# Build Standards (n8n; adapt names for other tools)

## Naming and structure
- Workflow name: `[client] area - action - env` (e.g. `[acme] leads - intake to CRM - prod`)
- Node names describe the action (`Create CRM contact`), not the node type
- One workflow, one job; extract repeated logic to sub-workflows (Execute Workflow node)
- Add a sticky note at the top: purpose, owner, trigger, dependencies, last change

## Reliability
- Every production workflow has an **error workflow** set (Error Trigger → alert)
- Validate input first; reject bad data early with a clear response
- Make writes idempotent: check for an existing record before create; use a stable key
- Set retry on flaky nodes with backoff; use timeouts; respect API rate limits (batching/wait)
- Handle empty results explicitly; never assume an array has items
- Use webhook authentication (header token or similar); separate test and production URLs; only activate after tests pass

## Secrets and access
- Credentials only in the tool's credential store; never hard-coded in nodes, expressions, notes, or repos
- One credential set per client; least-privilege service accounts; expiry dates recorded in the access register
- Back up the encryption key (self-host) separately and securely

## AI steps
- Pin model and prompt version; log inputs, outputs, cost; cap retries and spend
- Human approval before external send/publish; confidence threshold to route to a human queue
- Redact personal data before sending to a model unless approved

## Versioning and environments
- Export workflow JSON to git after every meaningful change; commit message states why
- Separate dev/test and production (instances or clearly named workflows); promote by export/import (check your plan for built-in source control features)
- Never edit production directly during business hours without a rollback copy

## Observability
- Alert on failure and on silence (expected run did not happen)
- Keep execution logs long enough to debug; prune per client policy
- Weekly check of failed executions and credential expiry

## Definition of done
- [ ] Spec approved · [ ] tests passed · [ ] UAT signed · [ ] error workflow live · [ ] runbook written · [ ] JSON in git · [ ] credentials logged · [ ] client trained
