---
name: bb-gap-analysis
description: Run a growth gap analysis on an existing product, idea, or toolkit (such as Business Builder) to find why growth is stalled and produce a prioritized fix list. Use when the user mentions gap analysis, growth problems, low signups, poor activation, churn, weak conversion, "why isn't this growing", audit my product, or wants fixes ranked by impact and effort.
---

# Growth Gap Analysis

Diagnose before prescribing. Score, find the binding constraint, then fix one thing at a time.

## Inputs
What the product does today, target user, pricing, traffic and funnel numbers (even rough), current channels, known complaints. If numbers are missing, mark the dimension "unmeasured" (itself a gap).

## Workflow
1. **Describe the current state** in 5 lines: user, job, promise, price, main channel.
2. **Score with `assets/gap-analysis-scorecard.md`** (0-5 each): ICP clarity, positioning, acquisition, activation (time to first value), retention, monetization, proof/social proof, onboarding, services layer, measurement.
3. **Map the funnel** with `assets/funnel-audit.md`: stage, volume, conversion, biggest leak.
4. **Find the binding constraint:** the single stage where fixing it moves the whole funnel. Say why the others are not the constraint.
5. **List fixes**, each with hypothesis, effort (S/M/L), impact (1-5), confidence, metric, and owner. Rank by (impact x confidence) / effort.
6. **Build the experiment backlog** (`assets/experiment-backlog.md`) for the top 5 fixes with success thresholds.
7. **Services layer check:** can the product be sold as a done-for-you or hybrid service? See `bb-services-offers`, `bb-client-acquisition`, `bb-workflow-automation`, and `bb-client-services`.

## Output
Scorecard, funnel map, binding constraint, ranked fix list, 30-day experiment plan.

## Guardrails
- Distinguish symptoms (low signups) from causes (unclear ICP).
- Do not recommend more than 3 concurrent experiments for a small team.
- State the evidence behind every score; unsupported scores default to "unmeasured".
