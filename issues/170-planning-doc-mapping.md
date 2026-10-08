# Ticket: Planning-doc mapping

Parent: [Wayfinder map: finish plans, todos, phases, tasks, issues; responsive UI everywhere](148-wayfinder-finish-all.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

For every file in `planning/`, is it shipped (where), explicitly deferred
(where), or does it hide unchecked work needing a new ticket?

## Scope

Read-only mapping. Unchecked work graduates as new tickets; everything else
lands in map 148 as shipped-or-deferred lines.

## Resolution: every planning doc is shipped or explicitly deferred

| Doc | Verdict |
|---|---|
| 00-master-plan (agency site, industries, leads) | shipped (routes + `/api/leads` live) |
| 01-master-plan-ecom + 02-ecom-build-plan (50 domains → suites) | shipped (tickets 085–093 catalogue/commerce) |
| 03-master-plan-finance (paise ledgers) | shipped (finance advance; paise math in POS/money paths) |
| 04-barcode + 05-inventory + 06-POS refinement | shipped (barcode engine, batches, catalog/stock split) |
| 07-HR + payroll contracts/spec | shipped (HR slices, payroll states, payslips); statutory slabs deferred (no verified rule tables — already out-of-scope) |
| 07-plan06-coverage | ledger current: zero todo markers; 3 partials are deliberate design calls (string-union enums, pooled ledger, single-sided ledger) |
| 08-theme-branding | Phase 1 shipped (command center + palette + uploads + identity); Phase 2+ token engine stays fog |
| 08-extensions-review | adopted Mantine set shipped; rejections stand |
| 09-POS-advance | first slices shipped (map 163); native shells + later phases stay fog |
| IMPLEMENTATION_CHECKLIST | infra notes only, zero unchecked items; Prisma steps are Linux-prod-only per AGENTS.md |

Zero `[ ]` boxes anywhere in planning/ or issues/. Nothing graduates.
