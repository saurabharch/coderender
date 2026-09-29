# Workflow Spec: {{workflow name}}
Client {{client}} · Version {{v}} · Owner {{owner}} · Tool {{n8n/Make/...}}

| Field | Definition |
|-------|-----------|
| Business goal / success metric | |
| Trigger (webhook, schedule, app event) | |
| Expected volume and peak | |
| Inputs and data fields (name, type, required) | |
| Systems touched and access level | |
| Steps (numbered, one action each) | |
| Branches and rules | |
| Human approvals | |
| Outputs / side effects | |
| Idempotency key (how duplicates are prevented) | |
| Retries and timeouts | |
| Error path and who is alerted | |
| Data retention / privacy notes | |
| Cost drivers (API calls, model tokens) | |
| Test cases (see test plan) | |
| Out of scope | |

## Diagram (text)
Trigger → Validate → Enrich → Decide → Act → Log → Notify
(replace with actual steps)

## Change history
| Date | Change | By |
|------|--------|----|
