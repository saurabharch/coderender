HR / Payroll API Contracts
Base: /api/v1
All endpoints require authenticated tenant context.
Common headers:
Authorization: Bearer 
X-Organization-Id: 
Idempotency-Key:  for mutation endpoints
Employees
POST /hr/employees POST /hr/employees/:id/employment GET /hr/employees GET /hr/employees/:id PATCH /hr/employees/:id GET /hr/employees/:id/timeline POST /hr/employees/:id/documents POST /hr/employees/:id/bank-accounts POST /hr/employees/:id/statutory-profile
Create employee request: { "employeeCode": "EMP-0001", "firstName": "A", "lastName": "B", "workEmail": "a@example.com", "employmentType": "FULL_TIME", "joiningDate": "2026-04-01", "departmentId": "...", "designationId": "...", "payrollGroupId": "..." }
Onboarding
POST /hr/onboarding GET /hr/onboarding GET /hr/onboarding/:id POST /hr/onboarding/:id/tasks/:taskId/complete POST /hr/onboarding/:id/complete
Attendance
POST /hr/attendance/check-in POST /hr/attendance/check-out GET /hr/attendance POST /hr/attendance/regularization POST /hr/attendance/regularization/:id/approve
Check-in: { "employeeId": "...", "timestamp": "2026-10-07T09:15:00+05:30", "source": "MOBILE" }
Timesheets
POST /hr/timesheets GET /hr/timesheets GET /hr/timesheets/:id POST /hr/timesheets/:id/submit POST /hr/timesheets/:id/approve POST /hr/timesheets/:id/reject
Leave
GET /hr/leave/balances POST /hr/leave/requests GET /hr/leave/requests POST /hr/leave/requests/:id/approve POST /hr/leave/requests/:id/reject POST /hr/leave/requests/:id/cancel POST /hr/leave/balances/:id/adjust
Create leave: { "leaveTypeId": "...", "startDate": "2026-10-12", "endDate": "2026-10-13", "quantity": 2, "reason": "Personal" }
Holidays
GET /hr/holidays/calendars POST /hr/holidays/calendars POST /hr/holidays/calendars/:id/holidays PATCH /hr/holidays/:id
Salary
GET /hr/employees/:id/salary POST /hr/employees/:id/salary POST /hr/employees/:id/salary/revise GET /hr/salary-structures POST /hr/salary-structures
Salary revision: { "effectiveDate": "2027-04-01", "structureId": "...", "annualCtcPaise": "90000000", "reason": "ANNUAL_APPRAISAL" }
Payroll
POST /hr/payroll/periods GET /hr/payroll/periods GET /hr/payroll/periods/:id POST /hr/payroll/periods/:id/runs POST /hr/payroll/runs/:id/calculate GET /hr/payroll/runs/:id GET /hr/payroll/runs/:id/exceptions POST /hr/payroll/runs/:id/review POST /hr/payroll/runs/:id/approve POST /hr/payroll/runs/:id/lock POST /hr/payroll/runs/:id/post-accounting POST /hr/payroll/runs/:id/mark-paid GET /hr/payroll/employees/:employeeId/history GET /hr/payroll/payslips/:id
Calculation response: { "runId": "...", "status": "CALCULATED", "employeeCount": 100, "grossPaise": "500000000", "deductionPaise": "70000000", "employerContributionPaise": "60000000", "netPayPaise": "430000000", "blockingExceptions": 0, "warningExceptions": 3 }
Statutory
GET /hr/statutory/policies POST /hr/statutory/policies POST /hr/statutory/policies/:id/rules PATCH /hr/statutory/rules/:id
GET /hr/statutory/pf GET /hr/statutory/esi GET /hr/statutory/professional-tax GET /hr/statutory/gratuity GET /hr/statutory/tds
Tax
GET /hr/tax/years POST /hr/tax/declarations GET /hr/tax/declarations POST /hr/tax/declarations/:id/submit POST /hr/tax/declarations/:id/verify POST /hr/tax/proofs GET /hr/tax/calculations/:employeeId GET /hr/tax/tds/:employeeId GET /hr/tax/form16/:employeeId
Expenses
POST /hr/expenses GET /hr/expenses POST /hr/expenses/:id/submit POST /hr/expenses/:id/approve POST /hr/expenses/:id/reject POST /hr/expenses/:id/pay
Loans
POST /hr/loans GET /hr/loans GET /hr/loans/:id POST /hr/loans/:id/approve POST /hr/loans/:id/close
Performance
POST /hr/performance/cycles GET /hr/performance/cycles POST /hr/performance/cycles/:id/goals POST /hr/performance/reviews POST /hr/performance/reviews/:id/submit POST /hr/performance/reviews/:id/complete
Employee lifecycle
POST /hr/employees/:id/promotion POST /hr/employees/:id/transfer POST /hr/employees/:id/probation POST /hr/employees/:id/confirm POST /hr/employees/:id/resignation POST /hr/employees/:id/exit POST /hr/exits/:id/clearance POST /hr/exits/:id/full-final/calculate POST /hr/exits/:id/full-final/approve POST /hr/exits/:id/full-final/pay
Announcements
POST /hr/announcements GET /hr/announcements POST /hr/announcements/:id/publish POST /hr/announcements/:id/acknowledge
Reports
GET /hr/reports/headcount GET /hr/reports/attendance GET /hr/reports/leave GET /hr/reports/payroll-register GET /hr/reports/salary-register GET /hr/reports/statutory GET /hr/reports/tax GET /hr/reports/employee-cost
Standard errors
400 VALIDATION_ERROR 401 UNAUTHENTICATED 403 FORBIDDEN 404 NOT_FOUND 409 CONFLICT 409 IDEMPOTENCY_CONFLICT 409 INVALID_STATE_TRANSITION 422 BUSINESS_RULE_VIOLATION 423 PAYROLL_LOCKED 500 INTERNAL_ERROR


