# Wayfinder map: Credit depth (reminders + statements)

Labels: wayfinder:map
Status: doing

## Destination

Udhari beyond balances: due reminders through existing notify channels and
a printable/shareable customer statement, on the current stack. Done when
each ticket is live-proved with chain green and CI green.

## Notes

- Domain: builds on udhari balances + terms (ticket 175); pure aging math in
  `credit-core.ts`. Buckets stay deferred (need invoice allocation).
- Skills every session: `implement` + `tdd`; `code-review` before release;
  `diagnosing-bugs` when live contradicts green. No new infra.
- Constraints: npm on-device; Prisma migrate Linux-only; never `pm2 restart`
  on red build; probe cleanup; reminders honor notification policy (bill-ish
  documents only, no spam).

## Decisions so far

<!-- one line per closed ticket, gist + link -->

## Not yet specified

- Installment/EMI schedules + allocation order (part-pay against which due).
- Label batch queue, PDF themes, forecasting — later maps in this order only
  if the owner calls for them.

## Out of scope

- Kitchen/customer displays + drawer kick — no ESC/POS/USB/BT hardware path
  on this device; needs a print-bridge host first (recorded 2026-10-09).
- Verbatim third-party code; statutory engines; native shells.

## Children

- [Udhari due reminders](181-udhari-due-reminders.md) — done (overdue-only tick + caps + logging live-proved)
- [Printable customer statement](182-printable-statement.md) — done (A4 statement page live-proved)
