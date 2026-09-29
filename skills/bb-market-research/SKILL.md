---
name: bb-market-research
description: Research the AI video startup landscape and produce a sourced market map, competitor teardowns, and a wedge recommendation. Use whenever the user mentions AI video, video generation startups, competitor research, market sizing, funding landscape, "who else is doing this", or needs to pick a niche in AI video or creator tooling, even if they do not say "research".
---

# AI Video Market Research

Produce a decision-ready research pack, not a link dump. Every claim is dated and sourced.

## Inputs to collect (ask only what is missing)
- Product idea in one sentence and the target user (creators, agencies, brands, SMBs)
- Geography and budget constraints
- Any competitors the user already knows

## Workflow
1. **Frame the question.** Write the 3 decisions this research must unlock (e.g. which wedge, which price band, build vs. wrap a model).
2. **Search the current landscape.** Use web search when available. Today's data beats memory: funding, launches, and pricing change monthly. Record the date of every source.
3. **Segment the market** into: frontier model labs, avatar/enterprise video, editor and workflow wrappers, ad-creative tools, brand-kit tools. Place the idea on the map (`assets/market-map.md`).
4. **Teardown 5-8 competitors** with `assets/competitor-teardown.md`: ICP, core promise, pricing, brand-kit depth, agency features, weaknesses seen in reviews.
5. **Find the gap.** Look for jobs users still do by hand: brand consistency across many outputs, approvals, multi-brand workspaces, performance feedback loops, emotional/tonal fit.
6. **Recommend one wedge** with evidence for and against, plus the cheapest test that would disprove it.
7. **Plan customer discovery** using `assets/interview-guide-customer-discovery.md` (10-15 interviews).

## Output
A single markdown file: Decisions -> Market map -> Teardowns -> Gap -> Wedge recommendation -> Risks -> Next 7 days. Put sources in a table at the end (title, URL, date accessed).

## Guardrails
- Never invent funding numbers, valuations, or user counts. If a number is unverified, say so.
- Separate facts (sourced) from inference (labelled "My read:").
- Do not treat vendor blog rankings as neutral; note when a source sells a competing product.
