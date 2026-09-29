---
name: bb-creator-intelligence
description: Design a creator intelligence tool that generates on-brand media creatives by combining tool-calling intelligence (agent orchestrating image, video, voice, and copy tools) with brand-emotion intelligence (tone, mood, pacing, palette, music rules). Use when the user talks about brand kits, creative automation, on-brand video or ad generation, brand voice or emotion profiles, tool-calling agents for creatives, or specifying this product's architecture or PRD.
---

# Creator Intelligence Tool Design

The product has two brains. Design both, then the loop between them.

## The two layers
1. **Tool-calling intelligence.** An orchestrator that plans a creative job, picks tools (script, image, video, voice, music, captions, resize), calls them in order, checks results, and retries. Specify tools in `assets/tool-registry.md`.
2. **Brand-emotion intelligence.** A structured profile that constrains every output: tone words, emotional arc, pacing, palette mood, music, humor level, taboo list, proof of on-brand examples. Capture it with `assets/brand-emotion-profile.md` and `assets/brand-kit-intake.md`.

## Workflow
1. Ask for: target user, 3 example brands, the top 3 creative jobs (e.g. 15s product ad, launch teaser, creator intro).
2. Fill the brand-emotion profile for one example brand end to end. If it cannot be filled, the schema is wrong: fix the schema first.
3. Define the **brand gate**: a scoring rubric (0-5 per dimension) applied to every generated asset before it is shown. Include a hard-fail list.
4. Draft the tool registry: name, inputs, outputs, cost, latency, failure modes.
5. Define the **feedback loop**: approvals, edits, and performance data update the emotion profile (with a human confirm step).
6. Write the PRD from `assets/creator-tool-prd.md`: scope for v0 (one job, one brand, three tools), v1, and what is explicitly out.
7. List the 5 riskiest assumptions and the smallest experiment for each.

## Output
PRD + filled brand-emotion profile for one brand + tool registry + brand-gate rubric.

## Guardrails
- v0 must run on one job and one brand. Resist platform scope.
- Brand gate decisions must be explainable in one sentence per failed dimension.
- Do not clone a real person's voice or likeness without documented consent; add a consent field to the intake.
- Flag any generated claim (health, financial, comparative) for human review.
