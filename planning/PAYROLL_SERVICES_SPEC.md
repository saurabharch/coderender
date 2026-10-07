HR Payroll Service / Transaction Specification
1. Money and precision
Store INR money as BigInt paise.
Never use floating point for payroll money.
Store percentage configuration as basis points (10000 = 100%) where practical.
Leave quantities may use fractional days/hours; payroll money must remain integer minor units.
Every calculation must return a calculation trace.
2. Payroll state machine
OPEN -> PROCESSING -> CALCULATED -> REVIEW -> APPROVED -> LOCKED -> PAID -> CLOSED
Allowed transitions must be enforced server-side.
No mutation of a LOCKED payroll. Corrections after LOCKED use PayrollAdjustment, reversal, or supplementary payroll.
3. calculatePayroll(periodId)
Transaction boundary:
Lock/check payroll period state.
Create PayrollRun with next runNumber.
Resolve eligible employees from PayrollGroup.
For each employee:
Load effective employment.
Load effective salary.
Load attendance.
Load approved leave.
Load approved overtime.
Load approved bonuses.
Load approved commissions.
Load approved reimbursements.
Load active employee statutory profile.
Resolve effective statutory policies/rules.
Resolve tax year and employee declaration.
Build immutable PayrollSnapshot.
Calculate paid days and LOP.
Calculate salary components.
Calculate gross.
Calculate PF/ESI/PT/LWF.
Calculate taxable income.
Calculate annualised tax and current TDS.
Calculate loans/advances.
Calculate net pay.
Calculate employer cost.
Persist PayrollEmployee and PayrollLine records.
Persist blocking/non-blocking PayrollException records.
Hash canonical snapshot inputs.
Mark run CALCULATED if no fatal system error.
Commit.
If any database error occurs, rollback the entire transaction.
4. Employee payroll algorithm
Inputs:
employee
effective salary
payroll dates
paid days
LOP days
attendance
leave
overtime
bonus
commission
reimbursement
loan schedule
tax declaration
statutory profiles
effective statutory rules
Paid days
paidDays = eligibleCalendarOrWorkingDays - unpaidLeaveDays - otherLossOfPay
Do not derive paid days solely from attendance if the organisation policy uses a different payroll calendar.
Proration
For a component marked prorateForLop:
prorated = configuredAmount * paidDays / payrollEligibleDays
Rounding must be explicit and deterministic.
Gross
gross = sum(earnings + taxable/non-taxable earnings + eligible reimbursements according to policy)
Statutory deductions
Run each engine independently:
PF ESI Professional Tax LWF TDS
Each engine returns:
{ employeeDeductionPaise, employerContributionPaise, taxableImpactPaise, trace, ruleVersion }
Tax
Determine tax year.
Determine employee regime.
Resolve current effective tax rules.
Annualise projected taxable income.
Apply deductions/exemptions permitted by selected regime.
Apply slabs.
Apply rebate/surcharge/cess rules.
Subtract already-deducted TDS.
Allocate current period TDS.
Persist TDSRecord.
Never embed tax slabs in PayrollService.
Net
netPay = grossEarnings - employeeDeductions - employeeTax - loanRecovery - otherApprovedDeductions
Employer contribution is not deducted from net pay.
5. Payroll exception policy
BLOCKING:
missing salary
invalid employee bank for payment
invalid statutory rule
negative net pay
missing mandatory tax data where policy requires it
overlapping salary assignments
duplicate payroll employee
WARNING:
missing optional document
unusually high overtime
unusual negative adjustment
tax declaration not verified
INFO:
new joiner
exit employee
special compensation
A payroll run cannot be APPROVED while blocking unresolved exceptions exist.
6. Approve payroll
Transaction:
Check run is CALCULATED/REVIEW.
Check no unresolved blocking exceptions.
Recalculate/verify aggregate totals against lines.
Verify total debit/credit preview if accounting mapping is enabled.
Set run APPROVED.
Record approver and timestamp.
Audit event.
7. Lock payroll
Transaction:
Require APPROVED state.
Recalculate integrity hash.
Verify all PayrollEmployee records are valid.
Create/finalize PayrollJournal draft.
Set PayrollRun LOCKED.
Set PayrollPeriod LOCKED.
Set lock timestamps.
Audit event.
After this point, do not update PayrollLine or PayrollEmployee values.
8. Post accounting
Transaction:
Verify payroll is LOCKED.
Build journal lines: Dr Salary Expense Dr Employer PF Expense Dr Employer ESI Expense Dr Gratuity Expense Cr Salary Payable Cr PF Payable Cr ESI Payable Cr PT Payable Cr TDS Payable Cr LWF Payable
Verify total debit == total credit.
Post to existing accounting ledger.
Store external journal ID/reference.
Audit.
If your application already has JournalEntry/JournalLine, PayrollJournal should be an integration bridge, not a second accounting ledger.
9. Salary revision
Transaction:
Resolve current active EmployeeSalary.
Create new EmployeeSalary with future/effective date.
Close old salary with effectiveTo = day before new effective date.
Create SalaryRevision.
Create EmployeeLifecycleEvent.SALARY_REVISED.
Audit.
Never overwrite historical salary.
10. Leave request
Transaction:
Validate employee is eligible.
Resolve LeavePolicy effective on request date.
Resolve holiday/weekend rules.
Calculate chargeable quantity.
Lock/read current balance.
Verify balance according to policy.
Create LeaveRequest.
Create pending balance effect or reservation.
Route approval.
On approval, create LEAVE_USED ledger transaction and update balance projection.
On rejection/cancellation, reverse reservation.
11. Attendance regularisation
Transaction:
Verify employee owns record or has manager/HR permission.
Load current attendance.
Create AttendanceAdjustment.
Approval required.
On approval update Attendance.
Audit old/new values.
12. Payroll snapshot
Snapshot must contain:
employee master fields relevant to payroll
employment
effective salary structure/components
attendance inputs
leave inputs
overtime
bonuses
commissions
reimbursements
loans
tax declaration
statutory profile
exact rule versions
calculation inputs
inputHash
The snapshot is the reproducibility boundary.
13. Idempotency
Every mutation endpoint that can be retried should accept Idempotency-Key.
Persist:
organizationId
key
route
requestHash
responseStatus
responseBody
createdAt
A repeated identical request returns the original response.
A reused key with a different requestHash is rejected.
14. Concurrency
For payroll:
Only one PROCESSING run per PayrollPeriod.
Use database transaction + application distributed lock where cloud deployment requires it.
For SQLite, serialize payroll mutation in the service layer.
For cloud PostgreSQL, use transaction locks/advisory-lock strategy.
For leave:
serialize balance mutation per employee + leave type + year.
For salary:
reject overlapping effective salary ranges.
15. Audit
Audit:
salary
bank
statutory IDs
tax declarations
payroll calculation
payroll approval
payroll lock
payslip access
leave balance adjustment
employee termination
full & final
Never log plaintext PAN, Aadhaar, bank account, or other sensitive values.
