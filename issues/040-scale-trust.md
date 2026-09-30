# Scale + trust: idempotency, abuse bans, sessions, avatar, address routing

Status: done
Labels: feature, security

## Question
Retries duplicate work; bots indistinguishable; one session per widget; no avatar;
addresses ignored; lead never created from wizard.

## Done when
- Idempotency-Key replay on chat-public (and leads); concurrent sessions via
  switcher (fp-scoped thread list + loader).
- Bot score (timing, headless UA, bursts, fp rotation) → flags + exponential bans.
- Agent avatar with pulsing active badge; address extraction routes issue-mail,
  lead creation, partner interest.
- Wizard completion creates Lead; ticket creation notifies team (+mail attempt).
- Chain green + adversarial smoke (replay, ban escalation, thread hop).
