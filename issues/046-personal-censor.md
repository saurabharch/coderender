# Personal address + trained censor

Status: done
Labels: feature

## Question
Bot is impersonal; censor is keyword-only; reference trains per request (unusable live).

## Done when
- Every reply addresses the known user (Mr./Ms. + name from chat/DB/memory).
- brain.js LSTM trained ONCE offline on rollout data.json; runtime classifies in ms;
  high-confidence hits force moderation blocks.
- Chain green + smoke (personalization, censor precision/recall spot-checks).
