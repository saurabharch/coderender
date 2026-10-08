# Ticket: Staff bonuses through payroll

Parent: [Wayfinder map: finish plans, todos, phases, tasks, issues; responsive UI everywhere](148-wayfinder-finish-all.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How are one-off staff bonuses awarded and paid through the monthly run —
new dated bonus rows picked up by `openRun`, or ad-hoc payroll adjustments?

## Findings (pre-chart trace)

- `PayrollLine` carries base/allowances/deductions/loanCut/net — no bonus
  leg; `openRun` snapshots active employees with no earnings beyond those.
- Payroll exception engine exists (read-only flags, `lib/people.ts:160`);
  hire/exit audit exists (`EmpEvent` promotion/resigned/exited + `fileExit`).
- Zero bonus/incentive/variable-pay concepts anywhere outside loyalty and
  partner referrals. This is the only genuine gap in the HR fog.

## Constraints

- Bonus rows dated (month-scoped) with reason + actor; runs stay
  re-runnable without double-paying (idempotent pickup).
- Net math stays pure and tested; payslip shows the bonus line.

## Resolution

Dated bonus rows picked up idempotently by the run:
- `Bonus` table + `PayrollLine.bonus` column; pure `netPay` gains optional
  bonus (tested, still floored at zero).
- Award-then-run and run-then-award agree (open runs get patched lines);
  paid runs refuse with "award next month".
- API award (owner/manager/hr only) + month bonus list + console award form
  + payslip bonus line.
Live proof on probe employee: 50000 award → run line net 3050000; second
25000 award patched the open run → 3075000; payslip shows the bonus line.
All probe rows cleaned.
