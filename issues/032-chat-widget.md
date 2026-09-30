# Public AI chat widget in floating dock

Status: done
Labels: feature

## Question
Floating dock has no AI chat entry; /api/chat is team-only.

## Done when
- Dock has 4th AI button opening a chat sheet (mobile) + desktop floating button.
- `/api/chat-public`: no login, scopes support/product/pricing/partner only,
  fingerprint rate-limit 20/hour, threads stored with userId NULL, audited.
- Chain green + smoke (anon chat, limit enforcement, isolation from team threads).
