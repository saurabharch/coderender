Implementation / Migration Checklist
Add schema.prisma to the HR domain or merge these models with your existing schema.
If your existing project already has Organization, User, Role, AuditLog, Accounting JournalEntry/JournalLine, Project, File, or Notification models, reuse them rather than duplicating them.
Add indexes from this schema.
Run: npx prisma format npx prisma validate npx prisma migrate dev --name add_hr_payroll npx prisma generate
Run seed: npx tsx prisma/seed-hr.ts
Existing-model integration points
Replace/relate:
Organization -> existing tenant/organization model
userId -> existing User model
actorUserId -> existing User model
PayrollJournal -> existing Accounting JournalEntry
fileId -> existing File/ObjectStorage model
projectId -> existing Project model
notification -> existing Notification/Outbox model
SQLite considerations
Money is BigInt paise.
JSON payloads are String because this keeps SQLite portability predictable.
Enums are application-level domain values; if your existing migration strategy avoids Prisma enums on SQLite, replace them with String + validation.
Do not use database-level partial indexes that your SQLite version cannot reproduce through Prisma migrations; add custom SQL migrations only where necessary.
Production rule
Do not seed statutory rates/slabs from memory. The supplied seed intentionally creates versioned placeholder policies. Before enabling production payroll, load verified rules for:
PF/EPS/EDLI
ESI
Professional Tax by state
Labour Welfare Fund by state
Gratuity
TDS
Income-tax regimes/slabs/rebates/surcharge/cess
applicable labour-code rules
Every rule needs effectiveFrom/effectiveTo and versioning.

