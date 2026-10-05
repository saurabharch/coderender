# Ticket 100-finance-advance

Status: done
Labels: feature

Advance existing ledgers per planning/03 (no parallel books, no rewrites):
- [x] Idempotent payments (intent + key; no double-charge on retry).
- [x] UPI QR (static/dynamic) + payment links + public /pay/[token].
- [x] Collection reminders tick (overdue bills → WA/email + notification).
- [x] Chart of accounts seed + P&L from journal.
- [x] Subscriptions (plan join/renew) + business loans (schedule/repay) minimal.
- [x] Hero slider for shop theme (slides CRUD, animation/type config).
- [x] Rich product create/edit (category, barcode, tax, mrp, images).
- [x] Sync outbox: DEFERRED honestly (no central server to sync to; Job queue covers local durability).
