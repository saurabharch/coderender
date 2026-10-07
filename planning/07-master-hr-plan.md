
Plan 1

For the application we have been designing, I would make HR + Workforce + Payroll + Employment Compliance a first-class business suite inside the same multi-tenant Business Operating System.

The resulting platform becomes:

> Business → Organisation → Employees → Employment → Attendance → Timesheets → Leave → Payroll → Statutory Compliance → Accounting → Employee Self-Service



This should integrate directly with the architecture we already established: Organization as tenant root, SQLite + Prisma for local/offline operation, PostgreSQL/Supabase/D1 as cloud authority, immutable accounting ledgers, RBAC, audit logs, outbox/sync, and the existing POS/ecommerce/inventory/billing/accounting domains.


---

1. Complete HR Suite

I recommend the following HR domain structure:

HR & Workforce
│
├── Organisation
│   ├── Company
│   ├── Legal Entity
│   ├── Branch
│   ├── Department
│   ├── Division
│   ├── Team
│   ├── Cost Centre
│   ├── Location
│   └── Reporting Hierarchy
│
├── Employee Management
│   ├── Employee Directory
│   ├── Employee Profile
│   ├── Employment
│   ├── Designation
│   ├── Job Roles
│   ├── Grades
│   ├── Employee Documents
│   ├── Emergency Contacts
│   ├── Bank Details
│   └── Statutory IDs
│
├── Recruitment
│   ├── Job Requisition
│   ├── Job Posting
│   ├── Candidates
│   ├── Applications
│   ├── Interviews
│   ├── Offers
│   └── Conversion to Employee
│
├── Onboarding
│   ├── Pre-joining
│   ├── Document Collection
│   ├── KYC
│   ├── Verification
│   ├── Tasks
│   ├── Equipment
│   ├── Access
│   ├── Training
│   └── Confirmation
│
├── Attendance
│   ├── Attendance
│   ├── Shifts
│   ├── Rosters
│   ├── Check-in/out
│   ├── Overtime
│   ├── Late
│   ├── Early Exit
│   ├── Missing Punch
│   └── Attendance Regularisation
│
├── Timesheet
│   ├── Daily Timesheet
│   ├── Weekly Timesheet
│   ├── Project Hours
│   ├── Task Hours
│   ├── Billable Hours
│   ├── Non-billable Hours
│   └── Approval
│
├── Leave
│   ├── Leave Types
│   ├── Leave Policies
│   ├── Leave Balance
│   ├── Leave Request
│   ├── Approval
│   ├── Holiday Calendar
│   ├── Leave Encashment
│   └── Leave Carry Forward
│
├── Payroll
│   ├── Salary Structure
│   ├── Earnings
│   ├── Deductions
│   ├── Payroll Period
│   ├── Payroll Run
│   ├── Payslip
│   ├── Reimbursement
│   ├── Bonus
│   ├── Incentive
│   ├── Commission
│   ├── Arrears
│   └── Full & Final Settlement
│
├── Statutory
│   ├── EPF
│   ├── EPS
│   ├── EDLI
│   ├── ESI
│   ├── Professional Tax
│   ├── Labour Welfare Fund
│   ├── TDS
│   ├── Income Tax
│   ├── Gratuity
│   └── Other State Compliance
│
├── Employee Benefits
│   ├── Insurance
│   ├── Mediclaim
│   ├── PF
│   ├── Gratuity
│   ├── Allowances
│   ├── Reimbursements
│   └── Loans/Advances
│
├── Performance
│   ├── Goals
│   ├── KPIs
│   ├── Reviews
│   ├── Appraisal
│   ├── Ratings
│   └── Promotions
│
├── Employee Lifecycle
│   ├── Probation
│   ├── Confirmation
│   ├── Transfer
│   ├── Promotion
│   ├── Salary Revision
│   ├── Suspension
│   ├── Resignation
│   ├── Termination
│   └── Exit
│
└── Communication
    ├── Announcements
    ├── Policies
    ├── Circulars
    ├── Notifications
    ├── HR Notices
    └── Employee Acknowledgement


---

2. Organisation Structure

Your existing organisation model should become the foundation.

Platform
   │
   └── Organization
         │
         ├── Legal Entities
         │
         ├── Businesses
         │
         ├── Branches
         │
         ├── Locations
         │
         ├── Departments
         │
         ├── Divisions
         │
         ├── Teams
         │
         ├── Cost Centres
         │
         └── Employees

Organisation fields

Organization
- id
- name
- legalName
- registrationNumber
- taxId
- pan
- tan
- gstin
- cin
- logo
- timezone
- currency
- country
- defaultLocale
- fiscalYearStart
- status


---

3. Department Management

Support:

Department
Division
Team
Sub-team
Cost Centre
Profit Centre
Location
Branch

Example:

Company
│
├── Corporate
│   ├── HR
│   ├── Finance
│   ├── Legal
│   └── IT
│
├── Sales
│   ├── Retail
│   └── Enterprise
│
└── Operations
    ├── Warehouse
    ├── Delivery
    └── Customer Support

Each employee can have:

primaryDepartment
secondaryDepartment
branch
location
team
costCenter
manager
hrManager
functionalManager


---

4. Employee Master

This becomes the central HR entity.

Employee

Employee
- id
- organizationId
- employeeCode
- userId
- firstName
- middleName
- lastName
- displayName
- gender
- dateOfBirth
- nationality
- maritalStatus
- personalEmail
- workEmail
- personalPhone
- workPhone
- profilePhoto
- joiningDate
- confirmationDate
- exitDate
- employmentStatus
- employmentType
- employeeCategory
- departmentId
- designationId
- gradeId
- branchId
- locationId
- managerId
- hrManagerId
- costCenterId
- payrollGroupId

Employment status

DRAFT
ONBOARDING
ACTIVE
PROBATION
CONFIRMED
NOTICE_PERIOD
SUSPENDED
ON_LEAVE
RESIGNED
TERMINATED
RETIRED
DECEASED
INACTIVE

Employment type

FULL_TIME
PART_TIME
CONTRACT
TEMPORARY
INTERN
APPRENTICE
CONSULTANT
FREELANCER
DAILY_WAGE
HOURLY
SEASONAL


---

5. Employee Documents

Create a document vault.

EmployeeDocument
- id
- employeeId
- documentType
- documentNumber
- issueDate
- expiryDate
- verificationStatus
- verifiedBy
- verifiedAt
- fileId
- remarks

Document types:

PAN
AADHAAR
PASSPORT
DRIVING_LICENSE
VOTER_ID
BANK_PROOF
EDUCATION_CERTIFICATE
EXPERIENCE_LETTER
RELIEVING_LETTER
OFFER_LETTER
APPOINTMENT_LETTER
EMPLOYMENT_CONTRACT
NDA
POLICY_ACKNOWLEDGEMENT
MEDICAL_CERTIFICATE
ADDRESS_PROOF
PHOTO
SIGNATURE

Store files in your existing object-storage layer rather than SQLite.


---

6. Employee KYC

EmployeeKyc
- employeeId
- pan
- aadhaarLast4
- bankAccount
- ifsc
- uan
- esicNumber
- professionalTaxNumber
- taxResidency
- verificationStatus

Important: don't store unnecessary full Aadhaar data. Encrypt sensitive identifiers and apply field-level access controls.


---

7. Recruitment / Hiring

Even though your question is primarily HR/payroll, the employment lifecycle should start before joining.

JobRequisition
JobPosition
JobPosting
Candidate
CandidateApplication
Interview
InterviewRound
InterviewFeedback
Offer
OfferApproval
OfferAcceptance

Workflow:

Department requests employee
        ↓
Job requisition
        ↓
HR approval
        ↓
Job posting
        ↓
Candidate
        ↓
Screening
        ↓
Interview
        ↓
Selection
        ↓
Offer
        ↓
Offer accepted
        ↓
Employee created
        ↓
Onboarding


---

8. Employee Onboarding

This deserves its own workflow engine.

Onboarding template

OnboardingTemplate
- id
- organizationId
- name
- employmentType
- department
- tasks

Example:

New Employee
│
├── Submit personal information
├── Upload PAN
├── Upload address proof
├── Bank account
├── PF information
├── ESI information
├── Sign appointment letter
├── Sign NDA
├── IT account
├── Email account
├── Laptop allocation
├── ID card
├── HR orientation
├── Department orientation
├── Security training
├── Policy acknowledgement
└── Manager confirmation

Onboarding task

OnboardingTask
- id
- onboardingId
- title
- description
- assignedTo
- dueDate
- completedAt
- status
- required

Statuses:

PENDING
IN_PROGRESS
BLOCKED
COMPLETED
WAIVED


---

9. Employee Offer & Employment Contract

Support:

Offer
EmploymentContract
ContractVersion
ContractTemplate
EmployeeAgreement
DigitalSignature

Generate:

Offer Letter
Appointment Letter
Employment Agreement
NDA
Confidentiality Agreement
Policy Agreement
Promotion Letter
Transfer Letter
Salary Revision Letter
Termination Letter
Experience Certificate
Relieving Letter


---

10. Job / Designation / Grade

Separate these concepts.

JobRole
Designation
JobLevel
Grade
SalaryBand

Example:

Software Engineer
    ↓
L2
    ↓
Grade B
    ↓
₹6L – ₹10L

Salary structure should then attach to the employee.


---

11. Employee Lifecycle

Every major employee event should create an immutable lifecycle event.

EmployeeLifecycleEvent

Examples:

JOINED
DEPARTMENT_CHANGED
DESIGNATION_CHANGED
MANAGER_CHANGED
BRANCH_TRANSFERRED
PROMOTED
SALARY_REVISED
PROBATION_EXTENDED
CONFIRMED
SUSPENDED
REINSTATED
RESIGNED
NOTICE_STARTED
TERMINATED
RETIRED
EXITED

This gives you a complete employee history.


---

12. Attendance Management

Attendance should be independent from timesheets.

Attendance
- employeeId
- date
- checkIn
- checkOut
- workMinutes
- breakMinutes
- overtimeMinutes
- status
- source

Sources:

WEB
MOBILE
BIOMETRIC
DEVICE
IMPORT
MANUAL
API

Attendance statuses:

PRESENT
ABSENT
HALF_DAY
WEEK_OFF
HOLIDAY
LEAVE
WORK_FROM_HOME
ON_DUTY


---

13. Shift Management

Shift
- name
- startTime
- endTime
- breakDuration
- graceMinutes
- overtimeAfterMinutes
- nightShift

Support:

Fixed shift
Flexible shift
Rotational shift
Split shift
Night shift
24-hour shift
Weekly roster


---

14. Roster Management

Employee
   ↓
Roster
   ↓
Shift Assignment
   ↓
Attendance

Example:

Monday    Morning
Tuesday   Morning
Wednesday Evening
Thursday  Evening
Friday    Night
Saturday  OFF
Sunday    OFF


---

15. Overtime

Create configurable overtime rules.

OvertimeRule
- organizationId
- employeeGroup
- minimumMinutes
- multiplier
- fixedRate
- approvalRequired

Examples:

Normal OT
Weekend OT
Holiday OT
Night OT
Emergency OT

Payroll receives approved overtime—not raw attendance.


---

16. Timesheet Management

This should be separate from attendance.

A person can be:

8 hours attendance

but:

Project A = 5h
Project B = 2h
Internal = 1h

Timesheet

Timesheet
- employeeId
- periodStart
- periodEnd
- status
- submittedAt
- approvedAt

Timesheet Entry

TimesheetEntry
- timesheetId
- date
- projectId
- taskId
- startTime
- endTime
- duration
- description
- billable

Statuses:

DRAFT
SUBMITTED
APPROVED
REJECTED
LOCKED


---

17. Leave Management

This should have two levels:

Organisation Leave Policy

Defines:

Leave Type
Accrual
Eligibility
Carry Forward
Encashment
Approval
Restrictions

Employee Leave

Tracks:

Opening
Accrued
Used
Pending
Adjusted
Encashed
Expired
Closing


---

18. Leave Types

Don't hard-code only CL/SL/EL.

Create configurable leave types:

CASUAL
SICK
EARNED
PRIVILEGE
ANNUAL
MATERNITY
PATERNITY
COMPENSATORY
BEREAVEMENT
STUDY
UNPAID
SPECIAL
MEDICAL
WORK_FROM_HOME

Each can have:

paid/unpaid
hourly/daily
accrual
carryForward
encashment
documentRequired
approvalRequired
minimumNotice
maximumDays


---

19. Leave Balance Ledger

Do not simply update a balance column.

Use a ledger:

LeaveBalanceLedger

Transactions:

OPENING
ACCRUAL
LEAVE_USED
ADJUSTMENT
CARRY_FORWARD
EXPIRY
ENCASHMENT
REVERSAL

Example:

Opening        +12
Accrual         +1
Leave Used      -2
Adjustment      +1
Expiry          -2
-------------------
Closing        10

This matches the immutable-ledger philosophy already used for accounting and inventory.


---

20. Holiday Management

Create:

HolidayCalendar
Holiday
HolidayAssignment

Support:

National Holiday
State Holiday
Company Holiday
Branch Holiday
Department Holiday
Optional Holiday
Restricted Holiday
Festival Holiday

Calendar can be assigned:

India
Maharashtra
Delhi
Karnataka
Branch A
Branch B


---

21. Employee Leave Approval

Workflow:

Employee
 ↓
Manager
 ↓
HR
 ↓
Approved

But make it configurable:

Employee → Manager

Employee → Manager → HR

Employee → HR

Employee → Department Head → HR

Use your existing approval/workflow engine.


---

22. Announcement System

Create organisation-wide communication.

Announcement
- title
- content
- category
- priority
- publishAt
- expiresAt
- authorId
- acknowledgementRequired

Categories:

GENERAL
HR
PAYROLL
HOLIDAY
POLICY
SAFETY
COMPLIANCE
TRAINING
URGENT

Target:

All Employees
Department
Branch
Location
Grade
Employment Type
Specific Employees


---

23. Announcement Acknowledgement

AnnouncementRecipient
- announcementId
- employeeId
- deliveredAt
- readAt
- acknowledgedAt

Useful for:

HR policy
Leave policy
Code of conduct
Security policy
Salary policy
Compliance notice


---

24. Salary Architecture

Do not store only:

salary = 50000

Create salary structures.

SalaryStructure
SalaryComponent
SalaryStructureComponent
EmployeeSalary
EmployeeSalaryComponent


---

25. Salary Components

Earnings

Basic
HRA
Special Allowance
Conveyance
Medical Allowance
Telephone Allowance
Meal Allowance
LTA
Bonus
Commission
Incentive
Overtime
Shift Allowance
Night Allowance
Performance Pay
Arrears
Reimbursement

Deductions

Employee PF
ESI
Professional Tax
TDS
Labour Welfare Fund
Loan EMI
Salary Advance
Other Deduction


---

26. CTC Structure

Example:

Annual CTC
│
├── Fixed Compensation
│   ├── Basic
│   ├── HRA
│   └── Allowances
│
├── Employer Benefits
│   ├── Employer PF
│   ├── Employer ESI
│   └── Gratuity Provision
│
├── Variable Pay
│   ├── Bonus
│   └── Incentive
│
└── Other Benefits

Keep CTC, Gross Salary, and Net Salary as distinct concepts.


---

27. Payroll Engine

The payroll engine should work like:

Payroll Period
       ↓
Employee Eligibility
       ↓
Attendance
       ↓
Leave
       ↓
Overtime
       ↓
Salary Structure
       ↓
Variable Earnings
       ↓
Reimbursements
       ↓
Statutory Calculations
       ↓
Tax Calculation
       ↓
Deductions
       ↓
Net Salary
       ↓
Payroll Approval
       ↓
Payslip
       ↓
Accounting Journal
       ↓
Bank Payment
       ↓
Statutory Filing


---

28. Payroll Period

PayrollPeriod
- organizationId
- year
- month
- startDate
- endDate
- payrollGroupId
- status

Statuses:

OPEN
PROCESSING
CALCULATED
REVIEW
APPROVED
LOCKED
PAID
CLOSED


---

29. Payroll Run

PayrollRun
- id
- periodId
- runNumber
- startedAt
- completedAt
- status
- initiatedBy

Each run creates immutable calculation snapshots.


---

30. Payroll Result

PayrollEmployee
- employeeId
- grossEarnings
- grossDeductions
- employerContributions
- taxableIncome
- tax
- netPay
- status

Then:

PayrollLine

contains every component.


---

31. Payroll Calculation

Conceptually:

Gross Earnings
=
Basic
+ HRA
+ Allowances
+ OT
+ Bonus
+ Incentive
+ Commission
+ Arrears
+ Other Earnings

Then:

Gross Earnings
-
Employee PF
-
Employee ESI
-
Professional Tax
-
TDS
-
Loan EMI
-
Advance
-
Other Deductions
=
Net Pay

Employer costs are tracked separately.


---

32. Payslip

Every payslip should contain:

Employee
Employee Code
Designation
Department
Pay Period
Paid Days
LOP Days

Earnings
-----------------
Basic
HRA
Allowances
OT
Bonus
Incentives
Other Earnings

Deductions
-----------------
PF
ESI
PT
TDS
Loan
Advance
Other

Gross Salary
Total Deduction
Net Salary

Employer Contributions
-----------------
Employer PF
Employer ESI
Gratuity Provision
Other Benefits

Generate PDF and employee portal version.


---

33. PF / EPFO

Make PF configurable rather than embedding one universal calculation.

Current EPFO material documents the employee contribution as generally 12%, with statutory contribution/account rules and a ₹15,000 wage ceiling in the standard configuration, while special cases and higher-wage contributions require different handling. 

Your system therefore needs:

PFPolicy
PFContributionRule
EmployeePFProfile
PFMonthlyContribution
PFReturn
PFPayment

Employee profile:

uan
pfMemberId
dateOfJoining
pfApplicable
epsApplicable
higherWageContribution
internationalWorker

Calculation:

Employee PF
Employer PF
EPS
EDLI
Administrative charges

Do not hard-code these percentages in TypeScript.


---

34. ESI

ESI should have:

ESIPolicy
EmployeeESIProfile
ESIMonthlyContribution
ESIReturn

The current ESIC published material states the combined contribution as 4% of wages: 3.25% employer + 0.75% employee, subject to applicability and the relevant rules/exemptions. 

Configuration:

contributionRate
wageDefinition
eligibilityThreshold
employeeContribution
employerContribution
effectiveFrom
effectiveTo


---

35. Professional Tax

Because your application is India-focused and supports multiple businesses/states, PT must be state-specific.

ProfessionalTaxPolicy
ProfessionalTaxSlab
EmployeePTProfile
PTTransaction
PTReturn

Example:

State
Effective Date
Salary Range
Monthly PT
Annual PT
Gender rules if applicable
Special exemption

Never hard-code Maharashtra PT into payroll.


---

36. Labour Welfare Fund

Create:

LWFPolicy
LWFContribution
LWFReturn

Because applicability, rates and payment schedules can vary by state.


---

37. Gratuity

Gratuity needs its own service.

GratuityPolicy
EmployeeGratuityProfile
GratuityAccrual
GratuityCalculation
GratuitySettlement

Track:

Date of joining
Eligible service
Last drawn wages
Eligible wage components
Completed years
Eligibility
Accrued liability
Paid gratuity

The platform should version the governing rules rather than assuming a fixed calculation forever.

For example:

GratuityCalculationRule
- effectiveFrom
- effectiveTo
- eligibilityRule
- wageDefinition
- serviceRule
- calculationFormula
- roundingRule

This is especially important because India's labour-code/rules framework continues to evolve; the Ministry of Labour currently publishes labour-code and draft-rule material. 


---

38. Income Tax / TDS

This should be a separate Tax Engine.

TaxEngine
│
├── TaxYear
├── TaxRegime
├── TaxSlab
├── DeductionRule
├── ExemptionRule
├── RebateRule
├── SurchargeRule
├── CessRule
├── EmployeeTaxDeclaration
├── InvestmentDeclaration
├── TaxProjection
├── MonthlyTDS
├── QuarterlyTDS
└── Form16

Employee should be able to choose/configure the applicable tax regime where permitted.


---

39. Employee Tax Declaration

Employee submits:

Tax Regime
Other Income
HRA
LTA
Home Loan
Eligible Investments
Insurance
Education
Donations
Other deductions

Supporting documents:

Investment Proof
Rent Receipt
Home Loan Certificate
Insurance Receipt
Education Receipt
Donation Receipt

The Income Tax Department's current guidance includes employee claims/information such as HRA, LTC, home-loan interest and eligible tax-saving claims for employer TDS calculations, and Form 16 as the salary TDS certificate. 


---

40. Tax Calculation Engine

Architecture:

Taxable Income
      ↓
Tax Regime
      ↓
Tax Slabs
      ↓
Deductions
      ↓
Exemptions
      ↓
Rebate
      ↓
Surcharge
      ↓
Cess
      ↓
Annual Tax
      ↓
Already Deducted
      ↓
Remaining Tax
      ↓
Monthly TDS

Most importantly:

TaxRuleVersion

must include:

taxYear
effectiveFrom
effectiveTo
regime
slab
rate
rebate
cess
surcharge
deduction
exemption

This protects the application when tax rules change.

The Income Tax Department currently distinguishes salary TDS treatment for the newer tax-year framework beginning April 2026, so your engine should explicitly model tax-year/rule versions instead of assuming the older section references forever. 


---

41. Form / Compliance Documents

HR should eventually generate:

Form 16
Salary Statement
TDS Statement
PF Contribution Report
ESI Contribution Report
PT Report
LWF Report
Gratuity Statement
Full & Final Statement
Bank Salary File


---

42. Employee Reimbursement

ExpenseClaim
ExpenseItem
ExpensePolicy
ExpenseApproval
ExpenseSettlement

Types:

Travel
Food
Hotel
Fuel
Internet
Mobile
Medical
Office
Client Meeting
Business Expense
Other

Workflow:

Employee
 ↓
Manager
 ↓
Finance
 ↓
Approved
 ↓
Payroll / AP
 ↓
Accounting


---

43. Employee Loans

Create:

EmployeeLoan
LoanSchedule
LoanInstallment
LoanPayment
LoanAdjustment

Types:

Salary Advance
Personal Loan
Emergency Loan
Travel Advance
Equipment Advance

Payroll can automatically deduct:

EMI


---

44. Bonus & Incentives

BonusPlan
BonusRule
BonusCycle
EmployeeBonus

Support:

Performance Bonus
Festival Bonus
Joining Bonus
Retention Bonus
Referral Bonus
Sales Incentive
Commission
Production Incentive
Attendance Bonus


---

45. Commission

This can integrate directly with your existing sales/POS/ecommerce platform.

Example:

Order
 ↓
Sales Employee
 ↓
Commission Rule
 ↓
Commission Transaction
 ↓
Payroll

Rules can depend on:

Product
Category
Sales value
Margin
Customer
Branch
Channel
Payment status

This is particularly valuable because your application already has POS/ecommerce/order infrastructure.


---

46. Performance Management

Add:

PerformanceCycle
Goal
GoalAssignment
KPI
Review
PerformanceRating
Appraisal
EmployeeFeedback
ManagerFeedback

Example:

Annual Goal
 ↓
Quarterly KPI
 ↓
Manager Review
 ↓
Employee Self Review
 ↓
Rating
 ↓
Salary Revision


---

47. Promotion

PromotionRequest
PromotionApproval
PromotionHistory

Automatically update:

Designation
Grade
Salary Band
Salary Structure
Reporting Manager
Department

But preserve historical records.


---

48. Salary Revision

SalaryRevision
- employeeId
- oldStructure
- newStructure
- effectiveDate
- reason
- approvedBy

Reasons:

Annual Appraisal
Promotion
Market Adjustment
Correction
Retention
Role Change
Location Change


---

49. Transfer

EmployeeTransfer

Support:

Branch transfer
Department transfer
Location transfer
Manager change
Legal entity transfer
Cost centre transfer


---

50. Probation Management

ProbationPolicy
ProbationPeriod
ProbationReview
ProbationExtension
Confirmation

Workflow:

Joining
 ↓
3/6 month probation
 ↓
Reminder
 ↓
Manager review
 ↓
HR review
 ↓
Confirm / Extend / Terminate


---

51. Resignation

Employee self-service:

Resignation
- resignationDate
- reason
- lastWorkingDate
- noticePeriod

Workflow:

Employee
 ↓
Manager
 ↓
HR
 ↓
Notice Period
 ↓
Exit Clearance
 ↓
Full & Final
 ↓
Relieving Letter
 ↓
Experience Certificate
 ↓
Employee Exit


---

52. Full & Final Settlement

This is essential.

Calculation:

Salary payable
+ Leave encashment
+ Bonus
+ Incentive
+ Reimbursement
+ Other earnings

-

Notice recovery
Loan balance
Advance
Asset recovery
Other deductions
TDS/statutory deductions

=

Final Settlement


---

53. Exit Clearance

Departments:

HR
Finance
IT
Admin
Security
Manager
Inventory
Legal

Clearance:

Laptop
Phone
ID Card
Access Card
Keys
Documents
Loans
Advance
Company Assets
Passwords/Access


---

54. Employee Self-Service Portal

Employee dashboard:

My Profile
My Attendance
My Timesheet
My Leave
My Holidays
My Payslips
My Tax
My Documents
My Reimbursements
My Loans
My Benefits
My Goals
My Performance
My Announcements
My Tasks


---

55. Manager Portal

Manager sees:

Team
Attendance
Leave Requests
Timesheets
Performance
Goals
Approvals
Payroll Summary
Announcements
Employee Documents


---

56. HR Admin Dashboard

Dashboard:

Total Employees
Active Employees
New Joiners
Exits
On Probation
Absences
Today's Attendance
Pending Leave
Pending Onboarding
Pending Documents
Payroll Status
Compliance Status
Upcoming Holidays
Upcoming Birthdays
Contract Expiry
Probation Expiry


---

57. Payroll Admin Dashboard

Payroll Period
Employees
Gross Payroll
Net Payroll
Employer Cost
PF
ESI
PT
TDS
Gratuity Provision
Reimbursements
Loans
Pending Approvals
Payroll Exceptions


---

58. Payroll Exception Engine

This is extremely important.

Before payroll is approved:

Employee missing bank
Employee missing PAN
Employee missing PF
Employee missing ESI
Negative salary
Excessive LOP
Missing attendance
Unapproved timesheet
Unapproved leave
Tax declaration missing
Salary structure missing
Duplicate employee
Invalid UAN
Invalid IFSC
Payroll component missing

Payroll should not silently calculate bad data.

Use:

PayrollException

with:

ERROR
WARNING
INFO


---

59. Payroll Approval

Implement four-eye control:

HR Payroll Operator
        ↓
Payroll Reviewer
        ↓
Finance Approver
        ↓
Final Lock
        ↓
Payment

After locking:

no direct mutation.

Corrections create:

PayrollAdjustment
PayrollReversal
SupplementaryPayroll


---

60. Accounting Integration

This is where your existing architecture becomes powerful.

Payroll creates accounting journals.

Example:

Dr Salary Expense
Dr Employer PF Expense
Dr Employer ESI Expense
Dr Gratuity Expense

Cr Salary Payable
Cr PF Payable
Cr ESI Payable
Cr TDS Payable
Cr PT Payable
Cr Gratuity Provision

Then salary payment:

Dr Salary Payable
Cr Bank

Statutory payment:

Dr PF Payable
Cr Bank

This uses the same immutable double-entry ledger already established for your application.


---

61. Cost Centre Accounting

Payroll lines should support:

Department
Branch
Location
Cost Centre
Project
Employee

Therefore:

₹10L payroll

can become:

Sales       ₹3L
Technology  ₹2L
HR          ₹1L
Operations  ₹3L
Admin       ₹1L


---

62. Project-Based Payroll

Because you already want timesheets:

Employee
 ↓
Timesheet
 ↓
Project
 ↓
Cost

You can calculate:

Project labour cost
Employee hourly cost
Billable labour
Non-billable labour
Project profitability


---

63. HR Notification Engine

Integrate with your existing notification architecture.

Channels:

In-App
Email
Push
SMS
WhatsApp

Events:

Leave Approved
Leave Rejected
Payroll Processed
Payslip Generated
Document Expiring
Probation Ending
Contract Ending
Birthday
Work Anniversary
Holiday Tomorrow
Announcement Published
Timesheet Pending
Approval Pending


---

64. Automation / Scheduled Jobs

Use the background-job architecture already planned.

Examples:

Daily:
Attendance processing

Daily:
Leave accrual

Daily:
Document expiry checks

Daily:
Probation reminders

Weekly:
Timesheet reminders

Monthly:
Payroll preparation

Monthly:
Payroll processing

Monthly:
PF/ESI/PT preparation

Quarterly:
Tax compliance

Annual:
Tax reconciliation

Annual:
Leave carry-forward


---

65. HR Database Model

The major Prisma models become approximately:

Organization
LegalEntity
Branch
Location
Department
Division
Team
CostCenter

Employee
EmployeeEmployment
EmployeeLifecycleEvent
EmployeeDocument
EmployeeBankAccount
EmployeeStatutoryProfile
EmployeeEmergencyContact

JobRole
Designation
JobLevel
Grade
SalaryBand

JobRequisition
Candidate
Application
Interview
Offer

Onboarding
OnboardingTask
OnboardingDocument

Shift
ShiftRule
Roster
RosterAssignment

Attendance
AttendanceAdjustment
Overtime
OvertimeApproval

Timesheet
TimesheetEntry
TimesheetApproval

HolidayCalendar
Holiday
LeaveType
LeavePolicy
LeaveBalance
LeaveBalanceLedger
LeaveRequest
LeaveApproval
LeaveEncashment

SalaryStructure
SalaryComponent
SalaryStructureComponent
EmployeeSalary
EmployeeSalaryComponent
SalaryRevision

PayrollGroup
PayrollPeriod
PayrollRun
PayrollEmployee
PayrollLine
PayrollAdjustment
PayrollException
Payslip

BonusPlan
EmployeeBonus
CommissionRule
EmployeeCommission

ExpenseClaim
ExpenseItem
ExpenseApproval
ExpenseSettlement

EmployeeLoan
LoanInstallment

PFPolicy
PFProfile
PFContribution
PFReturn

ESIPolicy
ESIProfile
ESIContribution
ESIReturn

ProfessionalTaxPolicy
ProfessionalTaxSlab
PTTransaction
PTReturn

LWFPolicy
LWFContribution

GratuityPolicy
GratuityAccrual
GratuityCalculation
GratuitySettlement

TaxYear
TaxRegime
TaxRule
TaxSlab
TaxDeclaration
TaxProof
TaxCalculation
TDSRecord
TaxReturn
Form16

PerformanceCycle
Goal
KPI
PerformanceReview
PerformanceRating

Promotion
Transfer
Probation
Confirmation

Resignation
ExitProcess
ExitClearance
FullFinalSettlement

Announcement
AnnouncementRecipient

HRPolicy
PolicyAcknowledgement

HRApproval
HRWorkflow
HRAuditLog


---

66. Most Important: Statutory Rule Engine

I strongly recommend this architecture:

StatutoryEngine
│
├── PF Engine
├── ESI Engine
├── PT Engine
├── LWF Engine
├── Gratuity Engine
├── TDS Engine
├── Income Tax Engine
└── Other Compliance Engines

Each has:

Policy
Rule
Version
Effective Date
Applicability
Formula
Threshold
Rate
Exception

Example:

TaxRule

id
country
state
taxType
taxYear
effectiveFrom
effectiveTo
ruleType
condition
formula
priority
version

This means a future rule change becomes:

Create new TaxRule version

rather than:

Rewrite payroll code


---

67. Payroll Calculation Architecture

Use a deterministic calculation pipeline:

PayrollInput
      ↓
EligibilityResolver
      ↓
AttendanceResolver
      ↓
LeaveResolver
      ↓
LOPResolver
      ↓
SalaryResolver
      ↓
EarningsCalculator
      ↓
OvertimeCalculator
      ↓
BonusCalculator
      ↓
ReimbursementCalculator
      ↓
PFCalculator
      ↓
ESICalculator
      ↓
PTCalculator
      ↓
LWFCalculator
      ↓
GratuityCalculator
      ↓
TaxCalculator
      ↓
DeductionCalculator
      ↓
NetPayCalculator
      ↓
EmployerCostCalculator
      ↓
AccountingMapper
      ↓
PayslipGenerator


---

68. Important Payroll Rule

Never make payroll dependent on mutable live records after calculation.

Create a snapshot:

PayrollSnapshot

containing:

Employee data
Salary structure
Attendance
Leave
Tax rules
PF rules
ESI rules
PT rules
Gratuity rules
Tax declaration

Therefore, if HR changes salary tomorrow, last month's payroll remains reproducible.


---

69. Audit Architecture

Every sensitive HR action should be audited.

HRAuditLog

Examples:

SALARY_CHANGED
BANK_CHANGED
TAX_DECLARATION_CHANGED
PF_CHANGED
EMPLOYEE_CREATED
EMPLOYEE_TERMINATED
PAYROLL_APPROVED
PAYROLL_LOCKED
PAYSLIP_VIEWED
DOCUMENT_VIEWED
LEAVE_APPROVED
LEAVE_BALANCE_ADJUSTED

For sensitive fields:

oldValue
newValue
changedBy
changedAt
reason
ipAddress
deviceId


---

70. HR RBAC

Extend the existing roles.

OWNER
ADMIN
HR_ADMIN
HR_MANAGER
RECRUITER
PAYROLL_ADMIN
PAYROLL_REVIEWER
FINANCE_MANAGER
MANAGER
EMPLOYEE
ACCOUNTANT
AUDITOR

Permissions:

hr.employee.read
hr.employee.create
hr.employee.update
hr.employee.delete

hr.salary.read
hr.salary.manage

hr.payroll.create
hr.payroll.calculate
hr.payroll.review
hr.payroll.approve
hr.payroll.lock

hr.leave.request
hr.leave.approve
hr.leave.manage

hr.attendance.read
hr.attendance.manage

hr.timesheet.submit
hr.timesheet.approve

hr.tax.manage
hr.statutory.manage
hr.documents.read
hr.documents.manage


---

71. Data Visibility

This is critical.

An employee should see:

Own profile
Own salary
Own payslips
Own tax
Own attendance
Own leave
Own timesheet

Manager:

Direct reports

HR:

Employees within authorised organisation/legal entity

Finance:

Payroll/accounting information

Auditor:

Read-only historical data


---

72. Privacy

Sensitive data should have additional protection:

PAN
Bank Account
IFSC
UAN
ESIC
Tax Information
Salary
Identity Documents
Address
Emergency Contact

Use:

Encryption at rest
Field-level encryption
RBAC
Audit trail
Masked display
Access logging
Document access control

Example:

Bank Account:
XXXX XXXX 1234

instead of displaying the full account number everywhere.


---

73. API Structure

Continue your existing:

/api/v1

structure.

/api/v1/hr/employees
/api/v1/hr/employees/:id
/api/v1/hr/employees/:id/documents

/api/v1/hr/departments
/api/v1/hr/designations
/api/v1/hr/grades

/api/v1/hr/recruitment/jobs
/api/v1/hr/recruitment/candidates

/api/v1/hr/onboarding
/api/v1/hr/onboarding/:id/tasks

/api/v1/hr/attendance
/api/v1/hr/attendance/regularization

/api/v1/hr/shifts
/api/v1/hr/rosters

/api/v1/hr/timesheets

/api/v1/hr/leaves
/api/v1/hr/leave-balances
/api/v1/hr/holidays

/api/v1/hr/payroll/periods
/api/v1/hr/payroll/runs
/api/v1/hr/payroll/calculate
/api/v1/hr/payroll/approve
/api/v1/hr/payroll/lock
/api/v1/hr/payroll/payslips

/api/v1/hr/tax
/api/v1/hr/pf
/api/v1/hr/esi
/api/v1/hr/professional-tax
/api/v1/hr/gratuity

/api/v1/hr/performance
/api/v1/hr/promotions
/api/v1/hr/transfers

/api/v1/hr/resignations
/api/v1/hr/full-final

/api/v1/hr/announcements


---

74. Next.js Structure

For the application we have been building:

app/
└── (dashboard)/
    └── hr/
        ├── dashboard/
        ├── employees/
        │   ├── page.tsx
        │   ├── new/
        │   └── [id]/
        │       ├── profile/
        │       ├── employment/
        │       ├── salary/
        │       ├── attendance/
        │       ├── timesheets/
        │       ├── leave/
        │       ├── documents/
        │       ├── tax/
        │       ├── benefits/
        │       ├── loans/
        │       └── history/
        │
        ├── recruitment/
        ├── onboarding/
        ├── attendance/
        ├── shifts/
        ├── rosters/
        ├── timesheets/
        ├── leave/
        ├── holidays/
        ├── announcements/
        ├── payroll/
        ├── tax/
        ├── statutory/
        ├── performance/
        ├── compensation/
        ├── loans/
        ├── expenses/
        ├── exits/
        └── settings/


---

75. Service Layer

Follow the architecture we already established:

UI
 ↓
API
 ↓
Service
 ↓
Domain Rules
 ↓
Repository
 ↓
Prisma
 ↓
SQLite/PostgreSQL

Services:

EmployeeService
EmploymentService
OnboardingService
AttendanceService
TimesheetService
LeaveService
HolidayService
SalaryService
PayrollService
TaxService
PFService
ESIService
PTService
GratuityService
ExpenseService
LoanService
PerformanceService
ExitService
AnnouncementService


---

76. Transaction Rules

Payroll should use transactions heavily.

For example:

calculatePayroll()

must atomically create:

PayrollRun
PayrollEmployee
PayrollLines
Statutory calculations
Payroll exceptions
Accounting preview

Then approval:

approvePayroll()

Then lock:

lockPayroll()

Locking creates an immutable payroll snapshot.


---

77. Offline-First HR

Because your application uses SQLite/local-first architecture:

Local SQLite
      ↓
Outbox
      ↓
Sync Queue
      ↓
Cloud API
      ↓
PostgreSQL/D1

But not everything should be offline writable.

Can be offline:

Attendance
Timesheet
Leave draft
Employee profile draft
Onboarding tasks
Announcements cached

Server-authoritative:

Payroll
Tax calculation
Statutory filing
Salary approval
Payroll locking
Final settlement
Accounting posting


---

78. Integration With Existing Commerce Platform

This is where the platform becomes significantly more powerful.

HR
 │
 ├── Employees
 │
 ├── Sales Commission
 │       ↑
 │      Orders
 │
 ├── Inventory
 │       ↑
 │    Warehouse Staff
 │
 ├── POS
 │       ↑
 │    Cashiers
 │
 ├── Projects
 │       ↑
 │    Timesheets
 │
 ├── Accounting
 │       ↑
 │    Payroll
 │
 └── Billing
         ↑
      HR SaaS subscription

For example:

₹10,00,000 Sales
       ↓
Salesperson commission
       ↓
₹20,000
       ↓
Payroll
       ↓
Accounting


---

79. HR Subscription for Your SaaS

Since your platform itself has subscriptions:

Business Subscription
        ↓
HR Module

Possible feature entitlements:

HR_BASIC
HR_PRO
PAYROLL
ATTENDANCE
TIMESHEET
RECRUITMENT
PERFORMANCE
STATUTORY
ADVANCED_PAYROLL

Pricing can be:

Per Employee
Per Active Employee
Per Payroll Employee
Per Organisation
Module-based

This reuses your existing subscription/billing engine.


---

80. HR Reports

At minimum:

Employee

Employee Master
Employee Directory
Employee Turnover
Headcount
Department Headcount
Branch Headcount
Gender/Category reports where legally appropriate
Joiners
Exits

Attendance

Daily Attendance
Monthly Attendance
Absence
Late
Overtime
Working Hours

Leave

Leave Balance
Leave Utilisation
Pending Leave
Leave Trend
Encashment
Carry Forward

Payroll

Payroll Register
Salary Register
Gross-to-Net
Net Salary
Employer Cost
Department Cost
Branch Cost

Statutory

PF
ESI
PT
LWF
TDS
Gratuity

Finance

Payroll Expense
Employee Cost
Cost Centre Payroll
Project Labour Cost
Commission
Bonus


---

81. HR Analytics

Dashboard KPIs:

Headcount
New Hires
Attrition
Absenteeism
Average Tenure
Payroll Cost
Cost / Employee
Overtime Cost
Leave Utilisation
Revenue / Employee
Labour Cost / Revenue
Department Cost
Employee Productivity


---

82. Employee Timeline

This should be one of the strongest screens.

Employee
│
├── 01 Jan 2025 Joined
├── 01 Jan 2025 Salary ₹X
├── 10 Jan 2025 Documents verified
├── 01 Jul 2025 Confirmed
├── 01 Apr 2026 Salary revised
├── 15 Apr 2026 Promotion
├── 01 May 2026 Department changed
└── ...

This comes from the immutable lifecycle-event model.


---

83. Compliance Calendar

Build:

ComplianceCalendar

with:

Payroll deadline
PF deadline
ESI deadline
PT deadline
TDS deadline
LWF deadline
Tax declaration deadline
Form generation
Return filing

But dates/rules should be configuration-driven by:

Country
State
Legal entity
Registration
Tax year
Effective date


---

84. Configuration Centre

HR Settings should have:

Organisation Settings
Employment Settings
Attendance Settings
Shift Settings
Timesheet Settings
Leave Settings
Holiday Settings
Salary Settings
Payroll Settings
Tax Settings
PF Settings
ESI Settings
PT Settings
LWF Settings
Gratuity Settings
Approval Settings
Notification Settings
Document Settings


---

85. Recommended Domain Separation

I would implement HR as these bounded contexts:

01 Identity
02 Organisation
03 Employee
04 Recruitment
05 Onboarding
06 Workforce
07 Attendance
08 Timesheet
09 Leave
10 Compensation
11 Payroll
12 Tax
13 Statutory
14 Benefits
15 Expense
16 Loan
17 Performance
18 Employee Lifecycle
19 Communication
20 HR Analytics

This prevents your Payroll service from becoming a giant monolith.


---

86. Critical Invariants

These should be enforced at the service/database level.

Employee

employeeCode unique per organization
workEmail unique where applicable

Payroll

Payroll period cannot overlap
Locked payroll cannot be modified
Approved payroll cannot be recalculated silently

Accounting

Debit = Credit

Leave

Leave balance cannot become negative unless policy permits it

Attendance

One authoritative attendance record per employee/date

Timesheet

Approved timesheet cannot be edited

Salary

Only one active salary structure per employee/effective period

Statutory

Rule must have effective date

Tax

Tax calculation must reference TaxRuleVersion


---

87. Overall Platform Architecture

Your complete application now looks like this:

BUSINESS OPERATING SYSTEM
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
   COMMERCE                 FINANCE                PEOPLE
       │                      │                      │
   Catalogue              Accounting                 HR
   POS                    Payments                  Employees
   Orders                 Expenses                 Recruitment
   Inventory              Invoices                 Onboarding
   Ecommerce              Taxes                    Attendance
   Marketplace            Banking                  Timesheet
       │                      │                     Leave
       │                      │                     Payroll
       │                      │                     Benefits
       │                      │                     Performance
       │                      │                     Exit
       └──────────────────────┼──────────────────────┘
                              │
                         ORGANISATION
                              │
                    Identity / RBAC / Audit
                              │
                       Workflow Engine
                              │
                     Notification Engine
                              │
                       Job/Queue Engine
                              │
                        Sync / Outbox
                              │
                ┌─────────────┴─────────────┐
                │                           │
            Local SQLite              Cloud Database
            + Prisma                  PostgreSQL/D1
                │                           │
                └────────── Storage ────────┘
                              │
                         Object Storage
                              │
                             R2


---

88. The Final HR Module Menu

The final application sidebar can be:

HR & PEOPLE

Dashboard

People
├── Employees
├── Departments
├── Designations
├── Grades
├── Organisation Chart
└── Employee Directory

Recruitment
├── Job Requisitions
├── Candidates
├── Interviews
├── Offers
└── Hiring

Onboarding
├── New Joiners
├── Tasks
├── Documents
├── Equipment
└── Orientation

Workforce
├── Attendance
├── Shifts
├── Rosters
├── Overtime
└── Timesheets

Leave
├── Leave Requests
├── Leave Balances
├── Leave Policies
├── Holidays
└── Encashment

Payroll
├── Salary Structures
├── Payroll Runs
├── Payroll Register
├── Payslips
├── Bonuses
├── Incentives
├── Reimbursements
├── Loans
└── Full & Final

Compliance
├── PF
├── ESI
├── Professional Tax
├── Labour Welfare
├── Gratuity
├── Income Tax
└── TDS

Performance
├── Goals
├── KPIs
├── Reviews
├── Appraisals
└── Promotions

Employee Lifecycle
├── Transfers
├── Salary Revisions
├── Probation
├── Resignations
├── Exit Clearance
└── Experience/Relieving

Communication
├── Announcements
├── Policies
├── Circulars
└── Acknowledgements

Reports
├── Employee
├── Attendance
├── Leave
├── Payroll
├── Tax
├── Statutory
├── Cost Centre
└── Analytics

Settings
├── HR Policies
├── Payroll Rules
├── Tax Rules
├── Statutory Rules
├── Approval Workflows
└── Notifications


---

89. Implementation Priority

I would not attempt all of this simultaneously.

Phase 1 — Foundation

Organization
Departments
Locations
Employees
Employment
Designations
Grades
Employee Documents
RBAC
Audit

Phase 2 — Workforce

Shifts
Roster
Attendance
Overtime
Timesheet
Holiday
Leave

Phase 3 — Compensation

Salary Components
Salary Structures
Employee Compensation
Bonus
Commission
Reimbursement
Loans

Phase 4 — Payroll

Payroll Period
Payroll Run
Gross-to-Net
Payslip
Payroll Approval
Payroll Lock
Accounting Integration
Bank Payment

Phase 5 — India Compliance

PF
ESI
PT
LWF
Gratuity
TDS
Income Tax
Form 16
Compliance Calendar

Phase 6 — Employee Lifecycle

Recruitment
Onboarding
Probation
Performance
Promotion
Transfer
Resignation
Full & Final
Exit

Phase 7 — Advanced

HR Analytics
Workforce Planning
Project Labour Cost
Advanced Commission
AI HR Assistant
Payroll anomaly detection
Attrition analytics
Employee self-service
Mobile attendance
Biometric integrations


---

90. One architectural rule I would make non-negotiable

For your application, HR should not become a collection of CRUD screens.

The core should be:

Employee
      ↓
Employment
      ↓
Workforce
      ↓
Attendance / Timesheet / Leave
      ↓
Compensation
      ↓
Payroll
      ↓
Statutory
      ↓
Accounting
      ↓
Payment

And every important state transition should produce an immutable event/audit record.

That gives you a platform capable of handling a small retail business with 3 employees, a multi-branch business with hundreds of employees, or eventually a large multi-tenant organisation, without having to redesign the payroll/accounting foundation later.

For statutory rules, I would specifically keep the implementation configuration/version driven because EPFO, ESIC and tax authorities publish rule changes, while labour-code rules continue to evolve. The Ministry of Labour currently maintains the labour-code framework and associated rule material, and EPFO/ESIC publish their contribution/compliance requirements separately. 

What this means for the existing application

Your application is now best modelled as:

BUSINESS OS
                      │
 ┌────────────────────┼────────────────────┐
 │                    │                    │
COMMERCE             FINANCE              HR
 │                    │                    │
Catalog               Accounting           Employees
POS                   Payments             Recruitment
Orders                Expenses             Onboarding
Inventory             Tax                  Attendance
Ecommerce             Banking              Timesheets
Marketplace                                Leave
Subscriptions                              Payroll
Billing                                    PF/ESI/PT
                                           Gratuity
                                           Income Tax
                                           Performance
                                           Exit
                      │                    │
                      └────────┬───────────┘
                               │
                         ORGANISATION
                               │
                     Identity + RBAC + Audit
                               │
                     Workflow + Notifications
                               │
                       Jobs + Sync + Storage

This is the HR/payroll foundation I would lock into the same product architecture before proceeding to the Prisma schema and implementation prompts. The next engineering artifact should be the complete Prisma schema for this HR domain (all models, enums, relations, indexes, unique constraints, audit fields, payroll snapshots, statutory rule versions, and seed data), followed by the payroll calculation/service-layer transaction specification and API contracts.



Plan 2

The HR/Payroll implementation package around your existing multi-tenant + SQLite/Prisma + accounting + POS/ecommerce + subscription architecture.

Files

1. Complete Prisma schema — ~70 KB

Organisation/legal entity/branch/location

Departments/teams/cost centres

Employee master + employment history

Recruitment + onboarding

Attendance + shifts + rosters + overtime

Timesheets

Leave policies, balances and immutable leave ledger

Holidays

Salary structures/components/revisions

Bonuses/commissions

Expenses/loans

PF/ESI/PT/LWF/gratuity/TDS/tax rule engine

Tax declarations/proofs

Payroll periods/runs/employees/lines

Payroll exceptions

Immutable payroll snapshots

Payslips

Performance/goals/appraisal

Promotion/transfer/probation

Resignation/exit/F&F

Announcements

HR audit logs

Payroll → accounting bridge

Extensive indexes and unique constraints


Download schema.prisma


2. Seed data

Demo organisation

Legal entity

Maharashtra/Pune branch

Departments

Employee

Employment

Salary structure

Salary components

Leave types/policies

Holiday calendar

Payroll group

Payroll period

Tax-year structure

Statutory policy/version placeholders


Importantly, I deliberately did not hard-code potentially outdated statutory rates/slabs into production seed data. They need to be loaded from verified applicable rules.

Download seed-hr.ts


3. Payroll calculation + service transaction specification

Covers:

Payroll state machine

Gross-to-net calculation

LOP/proration

PF/ESI/PT/LWF/TDS engine boundaries

Tax calculation

Payroll snapshots

Payroll exceptions

Approval/locking

Accounting posting

Salary revision

Leave transactions

Attendance regularisation

Idempotency

Concurrency

Audit requirements


Here ./PAYROLL_SERVICE_SPEC.md


4. Complete API contract specification

Covers endpoints for:

Employees
Employment
Onboarding
Attendance
Timesheets
Leave
Holidays
Salary
Payroll
PF
ESI
Professional Tax
Gratuity
TDS
Income Tax
Expenses
Loans
Performance
Promotion
Transfer
Probation
Resignation
Exit
Full & Final
Announcements
Reports

Includes request/response structures, idempotency requirements and standard error codes.

./HR_PAYROLL_API_CONTRACTS.md


5. Migration/integration checklist

./IMPLEMENTATION_CHECKLIST.md



Key architectural decisions

The schema deliberately uses:

Money       → BigInt paise
Percentage  → basis points where appropriate
Rules       → effectiveFrom/effectiveTo + version
Payroll     → immutable snapshots
Leave       → ledger + balance projection
Salary      → effective-dated records
Tax         → versioned rule engine
Statutory   → configurable rule engine
Accounting  → existing accounting ledger
Files       → existing object-storage layer
Identity    → existing User/RBAC system

So, for example, a salary change doesn't overwrite history:

Employee
   │
   ├── Salary #1
   │     effective 2026-04-01
   │
   ├── Salary Revision
   │
   └── Salary #2
         effective 2027-04-01

And a payroll run captures the exact inputs:

PayrollRun
   │
   └── PayrollSnapshot
          ├── Employee
          ├── Employment
          ├── Salary
          ├── Attendance
          ├── Leave
          ├── Overtime
          ├── Bonus
          ├── Commission
          ├── Tax
          └── Statutory Rules

That makes an old payslip reproducible even after HR subsequently changes the employee's salary, leave policy, or statutory configuration.

One caveat: I attempted an automated prisma validate, but the environment did not have a local Prisma CLI and the network-based npx validation timed out. I therefore corrected the schema's inverse-relation graph manually, but you should run:

npx prisma format
npx prisma validate
npx prisma migrate dev --name add_hr_payroll
npx prisma generate

against your actual existing schema because several models—particularly Organization, User, File, Accounting, Notification, and Project—should be merged with the models you already have rather than duplicated.

The next engineering layer should be the actual TypeScript implementation: PayrollService, PayrollCalculationEngine, TaxEngine, PFEngine, ESIEngine, ProfessionalTaxEngine, LeaveService, repositories, Prisma transaction wrappers, Zod request schemas, API handlers, and automated payroll test fixtures. ❶


Plan 3

The logical next implementation sequence is:
1. Prisma schema + migration
        ↓
2. Repository layer
        ↓
3. HR domain services
        ↓
4. Payroll calculation engine
        ↓
5. Statutory rule engines
        ↓
6. Transaction/workflow layer
        ↓
7. API + Zod contracts
        ↓
8. Next.js HR UI
        ↓
9. Payroll test suite
        ↓
10. Accounting + payment integration




Plan 4


