# Ticket 136-offline-pos-outbox

Status: done
Labels: plan06, pos, offline

Suggestion order #1. Offline counter: failed sales queue on-device with
idempotency keys, replay on reconnect, conflicts surfaced (never silent).

- [x] ShopOrder.ikey (migrate + unique) + posSale ikey dedupe.
- [x] retail-core newIkey() pure + test.
- [x] POS: offline capture → outbox banner → sync-now replay → dead-letter list.
- [x] Live: offline-simulated sale → replay → dedupe-proof → release.
