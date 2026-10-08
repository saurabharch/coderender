# Ticket: Staff bonuses through payroll

Parent: [Wayfinder map: finish plans, todos, phases, tasks, issues; responsive UI everywhere](148-wayfinder-finish-all.md)
Labels: wayfinder:task
Status: brief
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
