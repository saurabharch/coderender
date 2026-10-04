# Ticket 082-google-dashboard

Status: done
Labels: feature

## Goal
Calendar integration, Google Docs, Google Drive, and payment gateway keys —
all entered, tested, and connected from the admin dashboard (vault), never `.env`.
Env remains a fallback only; dashboard values override it.

## Scope
- [x] `google` in provider vault (GOOGLE_CLIENT_ID/SECRET) → auto-surfaces in Notify → Providers UI with Save/Test/Clear.
- [x] `lib/gcal.ts` reads creds vault-first; OAuth scopes expanded (calendar + drive.readonly + documents); granted scope-set recorded per token → honest "reconnect" state.
- [x] New: Drive list + Docs create/read (`lib/google.ts` + `/api/google/*` + `/admin/google` page + drawer link + OpenAPI entries).
- [x] Payments: verify razorpay/payu/easebuzz vault fields + test paths live; no code change expected.
- [x] Fixture tests (pure core), full chain green, live smoke (honest unconfigured states), commit + release.
