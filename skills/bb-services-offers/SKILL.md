---
name: bb-services-offers
description: Design productized service offers, packages, pricing, offer ladders, and a service catalog, for AI video creative services and workflow automation services. Use when the user asks what to sell, how to package services, how to price projects or retainers, how to turn custom work into fixed-scope offers, how many clients they can handle, or wants a services offer one-pager or catalog.
---

# Services Offers and Packaging

Sell fixed-scope, fixed-price outcomes. Custom work is a last resort.

## Inputs
Service lines, past or planned client jobs, hours available, target hourly value, cost per approved asset (from the resource plan), tool costs.

## Workflow
1. **List repeatable jobs** from discovery calls and past projects. Keep the ones that recur across clients.
2. **Build an offer ladder per service line** with `assets/offer-ladder-and-pricing.md`: (1) diagnostic (low price, fast), (2) project (fixed scope and date), (3) retainer (monthly, capped quota).
3. **Draft concrete packages** starting from `assets/offer-ai-video-creative-service.md` and `assets/offer-workflow-automation-service.md`. Keep only what you can deliver at target margin.
4. **Price it.** Use cost-plus (delivery hours x rate + tool/API costs, then margin) and a value anchor (what the client pays today or loses). Show good/better/best.
5. **Define scope hard:** inputs needed, deliverables, exclusions, revision rounds, timeline, client responsibilities, acceptance criteria.
6. **Run the capacity model:** hours per package x packages per month must fit available hours at 70% utilization.
7. **Write the one-pager** with `assets/offer-one-pager.md` and add it to `assets/service-catalog.md`.
8. **Review monthly:** retire offers with margin below target; raise prices when demand exceeds capacity.

## Output
Service catalog, one-pager per offer, pricing worksheet, capacity model.

## Guardrails
- No offer without exclusions and a change-request rule.
- Do not promise outcomes you do not control (revenue lift, rankings, virality); promise deliverables and time saved you can measure.
- Do not resell or host third-party tools in ways their licence forbids; see `bb-workflow-automation` for n8n.
- Prices in templates are placeholders; set them from your own costs and market checks.
