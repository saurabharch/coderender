# Monitoring and Runbook: {{client}}

## Alerts
| Alert | Trigger | Sent to | Response target |
|-------|---------|---------|-----------------|
| Workflow failed | Error workflow | {{channel/email}} | {{n}} hours |
| Expected run missing | No execution in {{window}} | | |
| Credential expiring | {{n}} days before expiry | | |
| Volume anomaly | > {{x}}% vs baseline | | |

## Common failures and fixes
| Symptom | Likely cause | Check | Fix |
|---------|-------------|-------|-----|
| 401/403 from app | Expired/revoked credential | Access register | Reauthorize; update register |
| Duplicates created | Missing idempotency check | Execution log | Add lookup before create; clean data |
| Workflow silent | Inactive after edit / trigger disconnected | Active toggle, webhook URL | Reactivate; retest |
| Slow runs | Large payloads, rate limits | Node timings | Batch, paginate, add waits |
| Data missing | Upstream field renamed | Input payload | Update mapping |

## Recovery
1. Pause affected workflow
2. Identify failed executions and affected records
3. Fix and retest in a copy
4. Reprocess safely (idempotent)
5. Tell the client what happened, impact, and prevention

## Restore (self-host)
Backup location {{}} · last tested restore {{date}} · steps {{}}

## Escalation
L1 {{name}} → L2 {{name}} → vendor support. Client contact {{name}}.
