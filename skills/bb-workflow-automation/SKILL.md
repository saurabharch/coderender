---
name: bb-workflow-automation
description: Design, sell, build, deploy, and run a workflow automation services offer for clients using n8n and similar tools (Make, Zapier, Activepieces, Pipedream, Windmill, Temporal). Covers automation audits, ROI, tool choice, hosting and licence model, workflow specs, n8n build standards, credentials handling, error handling, monitoring, UAT, handover, and managed retainers, including AI and agent steps. Use whenever the user mentions n8n, workflow automation, automation agency, integrations, no-code or low-code automation, webhooks, Zapier or Make scenarios, or a workflow engine for clients.
---

# Workflow Automation Services (n8n and similar)

Turn a client's manual, error-prone process into a reliable, monitored workflow they can own.

## Inputs
Client's process pain, systems involved (CRM, email, forms, accounting, storage, chat), volume per week, current time/cost, data sensitivity, who will maintain it, hosting constraints.

## Workflow
1. **Audit** with `assets/automation-audit.md`: list processes, score by hours saved, frequency, error cost, and feasibility. Shortlist 3.
2. **ROI** with `assets/roi-calculator.md`: payback period must be short enough to sell (state your threshold).
3. **Choose tool and hosting model** with `assets/tool-selection-matrix.md` and `assets/deployment-and-hosting-options.md`. **Check the licence before you promise any managed hosting.** For n8n, building workflows for clients is permitted; hosting clients' workflows and credentials on an instance you operate, or giving clients access to your instance, may need a commercial agreement. Default to a client-owned instance.
4. **Spec each workflow** with `assets/workflow-spec.md`: trigger, inputs, steps, branches, data fields, error paths, owner, success metric.
5. **Build to standards** in `assets/build-standards-n8n.md`: naming, sub-workflows, idempotency, retries, secrets in the credential store, error workflow on every production flow, exported JSON in git.
6. **Test** with `assets/test-plan-uat.md`: happy path, bad data, duplicates, rate limits, API outage, credential expiry. Client signs UAT.
7. **Deploy and monitor** with `assets/monitoring-and-runbook.md`; wire the error notifier (`assets/n8n/error-notifier.json` starter).
8. **Hand over** with `assets/handover-checklist.md` (access, docs, runbook, training) or move to a **managed retainer** (monitoring, fixes, a monthly quota of changes).
9. **Package it** as offers in `bb-services-offers` and log accounts and access in `assets/credentials-and-access-register.md`.

## AI and agent steps
- Human approval before anything client-facing is sent or published.
- Log prompts, model, inputs, outputs, and cost per run; version prompts.
- Cap spend and retries; fall back to a human queue on low confidence or failure.
- Never send personal or regulated data to a model the client has not approved.

## Guardrails
- Confirm current licence terms and pricing on the vendor's site before quoting; they change. Get written confirmation for any managed or multi-client hosting model.
- Least-privilege service accounts; one credential set per client; never reuse across clients; never paste secrets into chat, prompts, or repos.
- Starter workflow JSON in `assets/n8n/` are skeletons: import into a test instance, check node versions, and replace placeholder nodes before use.
- Document what breaks silently (expired tokens, changed APIs) and how you will detect it.
