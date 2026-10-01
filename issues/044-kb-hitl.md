# KB-grounded answers + HITL escalation

Status: done
Labels: feature

## Question
Answers come from the model or templates only; site/docs knowledge unused;
no human handoff when the bot fails.

## Done when
- `lib/kb.ts` indexes services, verticals, FAQs, GBP/social/support/pricing docs.
- Direct answers try KB first (cited), gateway grounded with KB context, HITL
  ticket+notify after repeated failures or /human.
- Widget shows answer source tags. Chain green + smoke.
