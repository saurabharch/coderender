# Wayfinder map: Installment schedules for dues

Labels: wayfinder:map
Status: done

## Destination

Customer dues payable in parts: dated schedules, oldest-first allocation,
every collection recorded against the schedule. Done when a part-payment
lands on the right slice with chain green and CI green.

## Notes

- Domain: extends udhari balances + terms (ticket 175); balance stays a
  single number, schedules are the allocation memory.
- Skills every session: `implement` + `tdd`; `code-review` before release;
  `diagnosing-bugs` when live contradicts green. No new infra.
- Constraints: npm on-device; never `pm2 restart` on red build; probe
  cleanup; collections stay atomic with ledger posts.

## Decisions so far

- [Installment schedules + allocation](184-installment-schedules.md): oldest-first allocation + single-path collection live-proved.

## Not yet specified

- Auto-debit/UPI Autopay rails (needs gateway keys — absent).
- Label batch queue, PDF themes — later maps if called for.

## Out of scope

- Interest/late-fee computation (no verified rule tables).
- Rewriting existing collect flow (schedules sit alongside, then absorb).

## Children

- [Installment schedules + allocation](184-installment-schedules.md) — done
- [Dues UI: pay-part + schedule view](185-dues-schedule-ui.md) — done
