Plan 1

Unified Booking Platform — Product Requirements Document
Document type: Product Requirements Document (PRD)
Status: Draft for engineering implementation
Version: 1.0
Date: 2026-10-09
Reference project: https://github.com/raindigi/room-booking-system
Target stack: Next.js, TypeScript, Prisma, SQLite for local/single-node operation, Inngest, existing business application services
1. Executive summary
Build a reusable, multi-tenant booking domain inside the existing business application. It must support room and venue reservations, hotel/stay bookings, asset/equipment hire, and property rentals while reusing the application’s existing UI conventions, hooks, permissions, accounts, customers, billing, invoices, payments, documents, POS, inventory, audit, and reporting infrastructure.
The reference repository is a room/resource-booking project. Its useful product patterns include availability discovery, date-based booking, filtering by capacity and equipment, floor/location navigation, recurring reservations, approvals, booking history, and utilization reporting. The target platform should adopt these user experiences and extend them into a robust booking-and-billing product. The reference is not assumed to implement every feature described in its user stories.
Core architectural principle: one booking domain, one authoritative allocation mechanism per deployment, one pricing service, one billing integration, and multiple profile-specific interfaces.
1.1 Outcomes
Staff can create and manage bookings from a calendar, list, resource page, or walk-in workflow.
Customers can discover availability and book online where the profile enables a public storefront.
The platform prevents conflicting allocations when requests pass through the same authoritative allocator.
The system supports offline staff operations with durable local storage and explicit synchronization/conflict states.
Bookings link to existing customer, invoice, payment, POS, inventory, document, and accounting records rather than duplicating them.
Different industries can share the engine without forcing their rules into a single oversized form.
1.2 Out of scope for the initial release
Full OTA/channel-manager integrations.
A public supplier marketplace and commission settlement system.
AI-dependent availability, pricing, or booking decisions.
Guaranteed conflict prevention across disconnected devices that cannot communicate.
Replacing the existing accounting ledger or payment provider integration.
2. Product profiles
The booking engine supports these configurable profiles.
2.1 Room and space reservations
Examples: meeting rooms, classrooms, halls, studios, co-working rooms, event venues.
Rules:
Hourly, fixed-slot, half-day, or full-day booking.
Capacity and amenity filtering.
Opening hours, setup/cleanup buffers, and recurring reservations.
Optional approval, equipment allocation, and room combinations.
Resource is released at the end of the allocated interval plus any configured buffer.
2.2 Hotel and stay bookings
Examples: hotels, resorts, guest houses, hostels, serviced apartments.
Rules:
Arrival and departure dates with half-open interval semantics: arrival is included; departure is excluded.
Nightly rates, minimum stay, guest counts, extra beds, and optional services.
Room assignment, check-in/out, housekeeping, extensions, deposits, and cancellation/no-show policies.
Occupancy metrics calculated using sellable room-nights rather than meeting-room time.
2.3 Asset and equipment rental
Examples: tools, equipment, vehicles, furniture, event equipment.
Rules:
Hire period, quantity, availability, and asset condition.
Handover/return records, deposits, damage, late-return fees, and maintenance blocks.
Serialized assets may be allocated individually; fungible stock may be allocated by quantity.
2.4 Property and long-term rental
Examples: apartments, houses, villas, commercial properties.
Rules:
Rental start/end dates, tenancy agreements, inspections, and security deposits.
Recurring rent schedules, extensions, termination, move-in/move-out, and outstanding balances.
Recurring rent is a billing schedule and is distinct from recurring room reservations.
3. Goals, non-functional requirements, and success measures
3.1 Product goals
Reuse existing infrastructure and UI patterns.
Deliver a complete staff booking workflow before expanding to every profile.
Make availability and allocation correctness a first-class concern.
Keep booking, invoice, and payment states independent but reconciled.
Support online and offline operations with honest status semantics.
Keep profile-specific behavior modular and testable.
3.2 Non-functional requirements
Security: tenant and branch/property scope enforced server-side on every read and write.
Consistency: allocation, booking creation, and relevant snapshots committed atomically wherever the database supports it.
Idempotency: retries of booking creation, payment callbacks, and sync operations must not create duplicates.
Auditability: lifecycle transitions, price overrides, cancellations, approvals, and financial links are attributable.
Accessibility: keyboard-operable forms and controls, clear focus states, accessible labels, and meaningful error messages.
Performance: paginated list endpoints; bounded calendar ranges; indexed availability queries; no unbounded fetches.
Recoverability: documented backup, restore, migration, sync retry, and failed-job recovery procedures.
Observability: structured logs, correlation IDs, metrics for failed allocations and background jobs.
Portability: Prisma schema and service behavior must be verified against each supported database provider.
Offline integrity: local data is durable, operations are replay-safe, and conflict outcomes are visible.
3.3 Initial success metrics
Establish baseline targets during Phase 0; recommended launch measures:
No confirmed overlapping exclusive-resource allocations through the authoritative allocator.
No duplicate invoice/payment allocations caused by retries.
100% of lifecycle-changing operations recorded in history.
All critical booking and billing journeys covered by automated integration tests.
Offline operations survive application reload/restart and are either accepted or visibly rejected/conflicted after sync.
Booking list and calendar response times measured against a representative seeded dataset before release.
4. Users, roles, and permissions
Role
Main responsibilities
Platform administrator
Global settings, support, feature availability
Organization owner
Business settings, financial oversight, policy configuration
Property/branch manager
Resources, staff, schedules, pricing, operational workflows
Reservation agent
Create, edit, confirm, reschedule, cancel permitted bookings
Front-desk operator
Walk-ins, guest registration, check-in/out, receipts
Asset manager
Asset availability, handover, return, condition, maintenance
Finance operator
Invoices, payments, refunds, deposits, reconciliation
Approver
Approve requests, discounts, exceptions, overrides
Housekeeping/maintenance
Room readiness, maintenance blocks, tasks
Customer/guest
Search, book, pay, and view permitted bookings
Auditor
Read-only authorized history and reports
4.1 Permission keys
Use granular permission keys integrated with the existing authorization system:
BOOKING.VIEW, BOOKING.CREATE, BOOKING.EDIT, BOOKING.CANCEL
BOOKING.RESCHEDULE, BOOKING.APPROVE, BOOKING.REJECT
BOOKING.CHECK_IN, BOOKING.CHECK_OUT, BOOKING.MARK_NO_SHOW
BOOKING.OVERRIDE_AVAILABILITY, BOOKING.OVERRIDE_PRICE
BOOKING.CONFLICT.RESOLVE, BOOKING.OFFLINE_SYNC
RESOURCE.VIEW, RESOURCE.MANAGE, RESOURCE.BLOCK
PRICING.VIEW, PRICING.MANAGE, DISCOUNT.APPROVE
PAYMENT.RECORD, PAYMENT.REFUND, INVOICE.VIEW
REPORT.VIEW, REPORT.EXPORT, AUDIT.VIEW
Permissions must be scoped by organization, business, branch, property, and/or resource as appropriate. Hiding a button is not authorization; the server must enforce every rule. Sensitive overrides require an audit reason.
5. Technical architecture and constraints
5.1 Target stack
Concern
Standard
Web application
Next.js App Router, React, TypeScript
UI
Existing component conventions using Tailwind CSS, shadcn/ui, and Mantine
Server state
TanStack Query where already used
Forms and validation
Existing form abstraction, React Hook Form, Zod
Persistence
Prisma; SQLite for local/single-node operation where suitable
Background jobs
Inngest
Offline storage
Local SQLite or the application’s existing durable local persistence adapter
Files/documents
Existing storage abstraction (e.g. R2, S3, MinIO)
Search
Existing search abstraction; local indexes for offline mode
Testing
Unit, integration, concurrency, browser, and sync tests
Use the repository’s existing conventions where they are already sound. Do not introduce duplicate database clients, auth systems, UI primitives, document renderers, or billing services.
5.2 Database deployment rule
SQLite is suitable for local installations and selected single-node deployments. A shared SQLite file should not be treated as the concurrency boundary for multiple online application instances.
Supported modes:
Local: device or local installation owns its SQLite database.
Online: a central authoritative database owns shared booking allocations and financial records.
Hybrid: local database caches authorized data and records offline operations; the central service validates and accepts/rejects sync operations.
Before production schema work, verify Prisma provider support, migration behavior, transactions, locking, and query capabilities for every target deployment. Do not assume identical behavior across SQLite and a server database.
5.3 Logical architecture
Next.js application
  ├── Staff dashboard / calendar / resource administration
  ├── Public booking storefront / customer portal
  └── Offline staff interface
          |
          v
Booking domain services
  ├── Resource management
  ├── Availability and allocation
  ├── Pricing and quote snapshots
  ├── Booking lifecycle and recurrence
  ├── Approvals and operations
  └── Offline sync and conflict resolution
          |
          +---- Existing customer/accounts
          +---- Existing invoices/payments/accounting
          +---- Existing POS/inventory
          +---- Existing documents/storage
          +---- Existing permissions/audit/reporting
          |
          +---- Inngest for durable background workflows
Inngest is not the source of truth for availability. Persist authoritative state before scheduling follow-up work.
6. Functional requirements
FR-01: Booking configuration
Provide a setup flow for:
Booking profile and enabled modules.
Organization, business, branch, property, and timezone.
Currency, locale, date/time display, and booking reference policy.
Confirmation policy: automatic, approval required, or payment required.
Default duration, lead time, booking horizon, and buffers.
Deposit, cancellation, refund, and no-show policies.
Rate plans, tax behavior, payment methods, and customer-account defaults.
Offline capability and sync policy.
Brand kit, document templates, and permitted communication channels.
Policy changes must be versioned or snapshotted where historical bookings depend on them.
FR-02: Resource management
Resource hierarchy is optional by profile:
Organization → Business/Branch → Property → Building → Floor/Area → Bookable Resource
Resource fields:
Name, code, description, type, operational status.
Capacity, amenities, equipment, images, attachments.
Location/floor/area and optional floorplan coordinates.
Supported profiles, schedules, durations, and rate plan.
Tax/deposit policy references.
Resource groups, combinable rooms, or quantity rules.
Maintenance blocks, cleaning buffers, and availability exceptions.
External reference and optional barcode/QR identifier.
Created/updated timestamps and actor/audit metadata.
Statuses: ACTIVE, INACTIVE, MAINTENANCE, OUT_OF_SERVICE, RETIRED.
Acceptance:
Authorized staff can create, edit, archive, import, and export resources.
Archived resources remain visible in historical bookings and cannot be newly allocated.
Optional hierarchy levels do not have to be populated for simple resources.
FR-03: Availability and conflict prevention
Availability must consider:
Confirmed allocations and active holds.
Pending bookings according to configured policy.
Opening hours, schedules, blackout dates, and maintenance.
Capacity, amenities, compatible resource combinations, and quantity.
Timezone, daylight-saving transitions, duration, and buffers.
Minimum/maximum stay, lead time, booking horizon, recurrence, and exceptions.
For time-slot bookings, intervals conflict when:
existingStart < requestedEnd
AND
existingEnd > requestedStart
For stays, use half-open intervals: arrival is included and departure excluded, subject to cleaning/turnover rules.
Confirmation transaction:
Validate tenant, permissions, resource, and policy.
Re-read authoritative availability.
Acquire the relevant transaction/locking mechanism.
Recheck conflicts within the allocation transaction.
Create booking and allocations atomically.
Persist price/policy snapshots and idempotency reference.
Commit, then schedule follow-up work.
A search result is advisory, not a reservation. Database-specific concurrency behavior must be tested, including SQLite busy/lock behavior where relevant. Arbitrary time-range overlap is not prevented by an ordinary unique constraint alone.
FR-04: Booking lifecycle
Primary states:
DRAFT
PENDING_APPROVAL
PENDING_PAYMENT
CONFIRMED
CHECKED_IN or IN_USE
CHECKED_OUT or COMPLETED
Exception states:
REJECTED
CANCELLED
NO_SHOW
EXPIRED
Rules:
Transitions are explicit and validated server-side.
Create for customers, guests, companies, or walk-ins.
Edit permitted fields without rewriting financial history.
Reschedule with new availability validation and policy-driven repricing.
Cancel one occurrence or a series according to policy.
Track actor, timestamp, reason, and before/after state.
Support extensions, early departure, late checkout, and authorized overrides.
Booking status, invoice status, and payment status are separate concepts.
FR-05: Recurrence
Support daily, weekly, and monthly rules, selected weekdays, end date or count, and exclusions.
Editing options:
This occurrence.
This and future occurrences.
Entire series.
Persist each occurrence as an independently allocated and trackable occurrence/booking. A conflict in one occurrence must not silently create an overlapping allocation or falsely report the entire series as successful. Return occurrence-level outcomes such as created, skipped, or conflict.
FR-06: Pricing and quotes
Supported pricing:
Hourly, fixed slot, half-day, full-day, nightly, and custom duration.
Weekday/weekend, seasonal, holiday, resource-specific, and customer-group rates.
Guest, extra bed, extra unit, cleaning, and optional-service charges.
Deposits, discounts, tax-inclusive/exclusive pricing, minimum stay.
Late-return fees, extensions, cancellation charges, and long-term rates.
Price calculation:
Base rate + extras + fees + taxes − discounts = payable total
Requirements:
Use integer minor currency units or an exact-decimal strategy; do not use binary floating-point for money.
Store currency and detailed line-item price snapshots.
Preserve confirmed price history.
Recalculate quotes when inputs change; confirmed price changes require a defined amendment flow.
Enforce discount limits and approval rules on the server.
Quotes expire and must be revalidated before confirmation.
FR-07: Approvals
Configurable triggers include resource policy, amount/duration threshold, discount threshold, corporate authorization, late booking, and requested overrides.
Each decision stores booking, action, approver, decision, reason, timestamp, and policy context. Rejection or expiry releases applicable holds according to policy.
FR-08: Online storefront
Customer journey:
Select property/location/resource type.
Select dates, time, duration, guests, or quantity.
Filter by availability, capacity, amenities, and price.
Review images, policies, rates, and availability.
Select extras.
Enter customer/guest information.
Review price and cancellation terms.
Select payment option and pay required amount.
Receive booking reference and view booking details.
Requirements:
Responsive mobile-first interface.
Shareable/SEO-friendly URLs where applicable.
Guest checkout only when enabled by policy.
Server-side validation of all selections.
Expiring holds and safe retries.
Accessible forms and clear error states.
Public routes must not expose private guest information or occupancy data.
FR-09: Offline and walk-in workflows
Offline staff mode supports:
Authorized cached resources, rates, schedules, and customer data.
Walk-in booking and local reference generation.
Local availability checks against the local dataset.
Permitted local payment recording and invoice/receipt printing.
Check-in/out, handover, and local booking search.
Durable outbox and visible pending/synced/rejected/conflicted status.
Disconnected devices cannot know about one another’s allocations. Strict exclusivity requires one booking authority, a LAN coordinator, or online confirmation. If multiple offline devices may allocate the same resource, synchronization must detect and surface conflicts; it cannot guarantee zero duplicates during disconnection.
FR-10: Operations
Stay workflows:
Arrival/departure board, room assignment, guest details.
Room readiness, housekeeping, and maintenance.
Early check-in, late checkout, extension, and additional charges.
Deposit settlement and check-out reconciliation.
Asset rental workflows:
Handover and return records.
Condition/damage records and attachments.
Expected versus actual return, late fees, extensions.
Inspection and service blocks.
Long-term property workflows:
Agreement, rental dates, security deposit.
Recurring rent schedule, extension, termination.
Move-in/move-out inspection and outstanding balances.
Keep these profile-specific workflows modular.
FR-11: Accounts, billing, payments, accounting
Reuse existing customer/account, invoice, payment, refund, and accounting services.
Required:
Quote-to-invoice.
Deposit and final invoice.
Full and partial payment allocations.
Booking-linked POS charges and extras.
Outstanding balance and customer statement.
Cancellation charges, credit notes, refunds, deposit settlement.
Corporate billing/payment terms.
Reconciliation and payment callback idempotency.
Use linking models such as BookingInvoiceLink, BookingPaymentAllocation, and BookingRefundLink. A booking may link to multiple invoices/payments. Do not assume invoice creation means payment received. Financial states derive from existing billing/payment rules.
FR-12: Documents and communications
Documents:
Booking confirmation/voucher.
Quote and booking invoice.
Receipt, refund receipt, and deposit statement.
Rental agreement.
Check-in/out or handover sheet.
Customer statement.
Reuse the existing document renderer, brand kit, fonts, storage, and printing support.
Respect existing outbound notification restrictions: customer notifications are limited to invoice, bill, receipt, credit repayment, and subscription renewal through approved WhatsApp, Telegram, and email channels, with attachments where supported. Booking approvals/reminders/cancellations should initially be represented as in-app activity/status records unless explicitly permitted by the existing communication policy.
FR-13: Reports and analytics
Filters: organization, branch, property, resource, profile, date range, status, channel, customer.
Reports:
Booking count by status/profile.
Occupancy and resource utilization.
Revenue, collected payments, and outstanding balances.
Average booking value and length of stay where applicable.
Cancellation, rejection, and no-show rates.
Lead time and peak demand.
Deposits and refunds.
Downtime/maintenance impact.
Approval turnaround.
Online versus staff-created booking mix.
Metric definitions must be profile-specific. Hotel occupancy uses sellable room-nights; room/space utilization uses available scheduled time.
FR-14: Cross-service integrations
Existing service
Integration
Accounts/CRM
Customers, companies, contacts, guests
Billing
Quotes, invoices, deposits, balances, credit notes
Payments
Attempts, verification, refunds, reconciliation
POS
Walk-in sale, add-on charges, booking-linked transactions
Inventory
Rentable assets and consumables
Accounting
Revenue/deposit/settlement entries via existing rules
Subscriptions
Recurring service fees; distinct from recurring bookings
Documents
Shared templates, PDF, print, attachments
Permissions/audit
Scoped access, history, overrides
Search/reporting
Resource discovery, filters, analytics
Inngest
Expiry, reconciliation, sync processing, report jobs
7. Data model and Prisma requirements
7.1 Model inventory
Create or adapt the following models only after auditing the existing schema.
Configuration and hierarchy
BookingProfile
BookingSettings
BookingPolicy
BookingChannel
Property
Building
Floor
Area
Resources and availability
ResourceType
BookableResource
ResourceAmenity
ResourceAsset
ResourceGroup
ResourceGroupMember
ResourceSchedule
AvailabilityException
ResourceBlock
MaintenanceRecord
Pricing
RatePlan
RateRule
SeasonalRate
BookingExtra
BookingPriceSnapshot
Bookings
Booking
BookingOccurrence
BookingSeries
BookingResourceAllocation
BookingGuest
AvailabilityHold
BookingApproval
BookingStatusHistory
BookingChangeRequest
Operations
CheckInRecord
CheckOutRecord
HousekeepingTask
DamageRecord
AssetHandover
BookingCharge
Financial links and synchronization
BookingInvoiceLink
BookingPaymentAllocation
BookingRefundLink
BookingExtraSelection
BookingEventOutbox
BookingSyncRecord
BookingImportJob
Do not duplicate existing Organization, Business, User, Customer, Invoice, Payment, Tax, or ledger models without a documented architectural reason.
7.2 Core field guidance
Model
Essential fields
BookingProfile
id, organization scope, code, profileType, settings, active state
BookingPolicy
profile, version, approval/cancellation rules, lead time, horizon
Property
business scope, name, code, timezone, address, status
BookableResource
scope, optional property/area, type, code, capacity, status, default rate
ResourceSchedule
resource, weekday/date, opening/closing, effective period
ResourceBlock
resource, start/end, reason, block type, creator, status
RatePlan
currency, unit, base rate, tax configuration, effective dates, status
Booking
reference, scope, profile, customer, status, dates/times, currency, snapshots, source
BookingResourceAllocation
booking, resource, interval, quantity, allocation state
BookingSeries
recurrence rule, timezone, series status and exception policy
BookingOccurrence
series, occurrence dates, linked booking and outcome
AvailabilityHold
resource/scope, interval, expiry, idempotency/token reference, status
BookingApproval
booking, action, decision, approver, reason, timestamps
BookingStatusHistory
booking, old/new state, actor, reason, timestamp
BookingPriceSnapshot
currency, line items, rates, discounts, taxes, deposit, total
BookingInvoiceLink
booking, existing invoice ID, purpose, linked amount
BookingPaymentAllocation
booking, existing payment ID, amount, status
BookingSyncRecord
local operation ID, device ID, status, server reference, conflict details
7.3 Integrity, indexes, and migrations
Recommended indexes:
(organizationId, businessId, status)
(organizationId, propertyId, resourceTypeId)
(resourceId, startAt, endAt)
(organizationId, customerId, createdAt)
(bookingId, createdAt) for history/events
(seriesId, occurrenceStartAt)
(status, expiresAt) for active holds
(syncStatus, createdAt) for offline sync
Enforce:
Unique booking reference within the chosen scope.
Unique external provider identifier where applicable.
Idempotency keys within a tenant/action scope.
Valid foreign keys and tenant ownership.
Soft-delete/archive semantics for resources referenced by history.
Exact monetary representation and currency snapshots.
Versioned policy/price snapshots where historical reproducibility matters.
SQLite does not natively enforce arbitrary interval non-overlap through a normal unique index. Use transaction-level service logic and deployment-specific locking/constraints where supported.
7.4 Prisma implementation rules
Use explicit enums or validated constants for lifecycle states.
Persist instants as DateTime and store timezone identifiers where needed.
Model hotel arrival/departure as date-only business semantics rather than arbitrary UTC instants.
Use exact monetary representations.
Add createdAt, updatedAt, and actor fields where appropriate.
Use migrations; do not silently mutate production schemas at application startup.
Seed profile types, permissions, statuses, rate plans, and development fixtures.
Test migrations against a representative existing database with POS records.
8. Service layer, folder structure, hooks, and API
8.1 Suggested folder layout
Adapt to the repository’s established structure rather than creating duplicate framework layers.
src/
  app/
    (dashboard)/
      bookings/
      calendar/
      resources/
      properties/
      rates/
      operations/
      reports/
    (storefront)/
      book/
      properties/
      resources/
    api/
      booking/
      bookings/
  features/
    booking/
      components/
      hooks/
      schemas/
      actions/
      services/
      repositories/
      policies/
      availability/
      pricing/
      recurrence/
      operations/
      integrations/
      offline/
      reports/
      tests/
  lib/
    prisma/
    auth/
    permissions/
    billing/
    payments/
    documents/
    inngest/
    sync/
8.2 Domain services
createBooking
updateBooking
cancelBooking
confirmBooking
checkAvailability
createAvailabilityHold
releaseAvailabilityHold
calculateBookingPrice
rescheduleBooking
createRecurringSeries
approveBooking
checkInBooking
checkOutBooking
extendBooking
recordBookingCharge
allocateBookingPayment
reconcileBooking
synchronizeOfflineBooking
Service methods own business rules, authorization, availability, lifecycle, idempotency, and transaction boundaries. UI hooks must not maintain separate versions of those rules.
8.3 Reusable hooks
useBookingList
useBookingDetails
useBookingMutations
useBookingAvailability
useBookingCalendar
useBookingFilters
useBookingRecurrence
useBookingPricing
useBookingApproval
useBookingPayments
useResourceList
useResourceCalendar
useCheckIn
useCheckOut
useBookingPermissions
useBookingSyncStatus
Hooks should use stable query keys scoped by tenant and filters. Mutations must invalidate/update only affected queries. Zod validates form/API boundaries; the service layer repeats critical validation and authorization.
8.4 API surface
Method
Endpoint
Purpose
GET
/api/booking/resources
Search resources
GET
/api/booking/availability
Availability query
POST
/api/booking/quotes
Calculate quote
POST
/api/booking/holds
Create temporary hold
DELETE
/api/booking/holds/:id
Release hold
POST
/api/bookings
Create booking
GET
/api/bookings
List/filter bookings
GET
/api/bookings/:id
Read authorized booking
PATCH
/api/bookings/:id
Update permitted fields
POST
/api/bookings/:id/confirm
Confirm
POST
/api/bookings/:id/cancel
Cancel
POST
/api/bookings/:id/reschedule
Reschedule
POST
/api/bookings/:id/approve
Approve/reject
POST
/api/bookings/:id/check-in
Start stay/use
POST
/api/bookings/:id/check-out
Complete stay/use
POST
/api/bookings/recurring
Create series
GET
/api/booking/reports/utilization
Utilization report
Use the existing API/server-action conventions. Maintain versionable authenticated APIs for external integrations where needed.
API rules:
Zod validation.
Server-side authorization and tenant scoping.
Idempotency for creation, confirmation, payment callbacks, and sync.
Structured errors: RESOURCE_UNAVAILABLE, HOLD_EXPIRED, PRICE_CHANGED, APPROVAL_REQUIRED, BOOKING_STATE_INVALID.
Consistent pagination/filter/sort/date-range contracts.
Never leak payment secrets or unauthorized guest data.
8.5 Inngest events
Use typed/versioned events:
booking.created
booking.confirmed
booking.cancelled
booking.rescheduled
booking.checked_in
booking.checked_out
booking.payment.recorded
booking.refund.requested
booking.hold.expiring
booking.series.created
resource.maintenance.created
booking.sync.requested
Handlers must be idempotent, bounded in retries, observable, and recoverable. Persist authoritative state before scheduling follow-up work. Never use a background job as the authority for allocating a resource.
9. UI/UX requirements
9.1 Staff navigation
Bookings
Calendar
Resources
Properties
Rate plans
Operations
Customers (link to existing CRM)
Payments (link to existing billing)
Reports
Settings
Use existing dashboard shell, sidebar, page headers, table patterns, filters, command menus, dialogs, drawers, status badges, and responsive conventions.
9.2 Staff calendar
Required views:
Day, week, month, agenda.
Resource timetable and availability grid.
Date range and branch/property selector.
Filter by resource type, status, customer, and profile.
Booking quick-create and details panel.
Clear conflict/hold/maintenance indicators.
Drag-and-drop only when it invokes server-side rescheduling validation.
Export under appropriate permissions.
9.3 Booking wizard
Select profile/property/resource.
Choose dates/times/duration/guests/quantity.
Check availability.
Select customer/guest/company.
Choose rate plan and extras.
Review price, taxes, deposit, and policies.
Select approval/payment behavior.
Review and create/confirm.
9.4 Reusable components
BookingCalendar
BookingCalendarToolbar
BookingTimetable
BookingListTable
AvailabilityGrid
ResourceCard
ResourceFilters
PropertySelector
BookingForm
BookingWizard
BookingSummary
BookingPriceBreakdown
BookingStatusBadge
BookingApprovalPanel
BookingDetailSheet
RecurringBookingForm
CheckInPanel
CheckOutPanel
BookingConflictDialog
ResourceMaintenanceDialog
BookingTimeline
BookingUtilizationChart
9.5 Required UI states
Every screen needs loading, empty, validation error, server error, permission denied, offline, pending sync, conflict, and success states where applicable. Never display a local/offline booking as globally confirmed before authoritative acceptance.
10. Step-by-step implementation phases
Estimates below are indicative working days for one experienced full-stack developer with existing infrastructure available. They are planning ranges, not delivery commitments.
Phase 0 — Repository audit and reuse inventory (3–5 days)
Tasks:
Inspect Next.js structure, Prisma schema, migrations, and SQLite deployment.
Trace POS from sale through payment, invoice, receipt, and accounting.
Identify existing customer, account, tax, payment, document, permission, audit, and offline services.
Inventory reusable components, hooks, forms, tables, calendar patterns, and query keys.
Inspect Inngest setup, offline persistence, outbox, sync, and conflict handling.
Record test commands and migration procedures.
Deliverables:
Existing architecture map.
Reuse-versus-create matrix.
Integration diagram and risk register.
Database/deployment decision record.
Exit criteria:
No duplicate core financial models planned without justification.
Existing feature/module conventions are documented.
Online/offline allocation authority is understood.
Phase 1 — Domain boundaries and architecture (3–5 days)
Tasks:
Define booking terminology and lifecycle.
Define profiles and profile-specific rules.
Specify allocation intervals, holds, recurrence, and timezones.
Define permission scopes, idempotency, audit, and error contracts.
Define billing boundaries and online/offline synchronization behavior.
Write architecture decision records.
Deliverables:
Domain diagram.
State-transition contract.
API contract draft.
Permission catalogue.
Offline/concurrency strategy.
Exit criteria:
All profiles share the allocation engine without duplicating their business rules.
Critical behavior is defined independently of UI components.
Phase 2 — Prisma schema, migrations, seed data (4–7 days)
Tasks:
Add configuration, resource, schedule, booking, allocation, pricing, history, and operations models.
Add invoice/payment/refund link entities.
Add idempotency and synchronization records.
Add indexes, uniqueness rules, and foreign keys.
Write migrations and seed data.
Test migration against an existing POS database.
Deliverables:
Prisma schema and migrations.
Seed scripts.
ERD and integrity tests.
Migration/recovery runbook.
Exit criteria:
Fresh and existing databases migrate successfully.
Existing POS data remains intact.
Duplicate references and invalid relationships are rejected.
Phase 3 — Resource management and availability engine (6–10 days)
Tasks:
Implement resource CRUD and optional hierarchy.
Implement schedules, exceptions, maintenance, and blackout rules.
Implement capacity, amenities, resource groups, and quantity rules.
Implement hourly, slot, and stay availability.
Implement holds, expiry, and release.
Implement transactional conflict checks and alternative suggestions.
Add concurrency, timezone, DST, and SQLite locking tests.
Deliverables:
Resource and availability services/APIs.
Hold service.
Conflict and timezone test suite.
Exit criteria:
Conflicting exclusive allocations cannot both be confirmed by the same authoritative allocator.
Hold expiry and transaction failure behave predictably.
Phase 4 — Shared UI, calendar, hooks (6–10 days)
Tasks:
Build booking dashboard shell.
Build resource list/cards and property selector.
Build calendar, timetable, availability grid, and filters.
Build quick-create form and booking detail sheet.
Implement reusable hooks and stable query keys.
Add loading, empty, error, offline, and permission states.
Add responsive/accessibility and browser tests.
Deliverables:
Staff booking dashboard.
Calendar and resource views.
Reusable components and hooks.
UI tests and component documentation.
Exit criteria:
UI uses existing application patterns.
All critical actions invoke shared services and refresh affected queries.
No business-critical rules exist only in client code.
Phase 5 — Lifecycle, pricing, approvals, recurrence (7–12 days)
Tasks:
Implement create/update/confirm/cancel/reschedule.
Implement status history and permitted transitions.
Implement quotes, rate plans, extras, taxes, discounts, deposits, and snapshots.
Implement approval queue and audit reasons.
Implement recurring series and occurrence-level conflict results.
Implement extension and late/early checkout repricing.
Add lifecycle and pricing tests.
Deliverables:
Booking lifecycle service.
Pricing/quote engine.
Approval and recurrence workflows.
Transition and pricing tests.
Exit criteria:
Invalid transitions and stale/expired holds are rejected.
Price snapshots are reproducible.
Recurrence conflicts are visible and never silently double-booked.
Phase 6 — Accounts, billing, payments, documents (5–8 days)
Tasks:
Integrate existing customer/account selection.
Implement booking quote to invoice.
Implement deposit, partial payment, final invoice, and outstanding balance.
Integrate payment verification and refund handling.
Link POS charges and extras.
Generate branded booking documents and receipts.
Apply existing communication policy.
Test callback retries, allocations, cancellations, and refunds.
Deliverables:
Billing adapters and financial links.
Booking documents.
Reconciliation and idempotency tests.
Exit criteria:
Booking, invoice, and payment states remain independent and consistent.
Retried callbacks do not duplicate financial allocations.
Cancellation does not falsely imply a refund occurred.
Phase 7 — Offline mode and synchronization (7–12 days)
Tasks:
Define local persistence mapping and device identity.
Implement durable outbox and local operation IDs.
Cache authorized resources/rates/customer data.
Support walk-in creation, local references, and local receipts.
Implement idempotent server sync ingestion.
Revalidate availability and policy during sync.
Add conflict-resolution UI and audit history.
Add retry/backoff and manual recovery.
Test restart, network loss, duplicate sync, and conflicting offline allocations.
Deliverables:
Offline adapter and outbox.
Sync endpoint/worker.
Conflict resolution UI.
Recovery runbook.
Exit criteria:
Local operations survive restarts.
Replayed sync operations do not duplicate bookings.
Conflicts are explicit and auditable.
UI does not claim global confirmation prematurely.
Phase 8 — Online storefront and customer portal (6–10 days)
Tasks:
Build public resource/property listings and availability search.
Build customer booking wizard, quote, hold, and payment flow.
Build confirmation and customer booking history.
Implement permitted changes/cancellations.
Add SEO metadata, rate limiting, and abuse controls.
Test payment success/failure/retry/abandonment and hold expiry.
Verify public privacy boundaries.
Deliverables:
Public booking storefront.
Customer portal.
Payment integration and security tests.
Exit criteria:
Customers can search, quote, reserve, pay, and view their bookings.
Confirmation revalidates availability.
Payment callbacks cannot create duplicate bookings.
Phase 9 — Operations, reports, integrations (6–10 days)
Tasks:
Implement arrival/departure or start/end-of-use boards.
Implement assignment, check-in/out, housekeeping, and maintenance.
Implement asset handover, return, damage, and late fee workflows.
Implement long-term rental agreement and rent schedule features as needed.
Integrate POS, inventory, accounting, and CRM.
Implement utilization, occupancy, revenue, deposit, and outstanding reports.
Add export permissions, indexes, and query optimization.
Test operational and financial reconciliation.
Deliverables:
Operations dashboard.
Maintenance/housekeeping/handover workflows.
Reports and exports.
Cross-service integration tests.
Exit criteria:
Operational actions use valid lifecycle transitions.
Charges are created through existing billing services.
Reports reconcile with booking and financial source records.
Phase 10 — Security, reliability, rollout (5–8 days)
Tasks:
Complete tenant isolation and authorization tests.
Audit public routes, uploads, and guest data exposure.
Test concurrency, payment retries, timezones, recurrence, and sync.
Test migrations, backup/restore, and recovery procedures.
Add structured logs, metrics, correlation IDs, and job failure monitoring.
Add feature flags and staged rollout.
Load-test calendar, search, and availability queries.
Write support/runbook documentation and pilot one profile.
Deliverables:
Release candidate.
Security and test report.
Monitoring dashboard.
Backup/recovery and rollout runbooks.
Staff/admin documentation.
Exit criteria:
Critical tests pass.
Failed jobs and sync operations can be recovered.
A booking can be traced from creation through allocation, billing, payment, and completion.
Indicative sequential estimate: 58–97 working days for one experienced full-stack developer. QA, integration, payment-provider requirements, and repository complexity may change the estimate. Parallel work may shorten calendar time but increases coordination needs.
11. Testing strategy
Testing begins in Phase 2 and grows with each phase.
Area
Required scenarios
Availability
Overlaps, back-to-back slots, maintenance, expired holds
Concurrency
Simultaneous allocation attempts, rollback, SQLite lock contention
Time
Timezones, DST, overnight reservations, date-only stays
Recurrence
Conflicting occurrences, exclusions, future-series edits
Pricing
Tax rounding, discounts, deposits, extensions, snapshot immutability
Lifecycle
Invalid transitions, cancellation, no-show, rescheduling
Billing
Partial payments, duplicate callbacks, refunds, outstanding balances
Security
Cross-tenant access, branch scope, overrides, guest data exposure
Offline
Duplicate sync, network loss, conflict resolution, restart recovery
UI
Keyboard navigation, responsive layout, validation, error/empty/loading states
Documents
PDF accuracy, invoice details, print layouts, branding, attachments
Reports
Date filters, profile-specific denominators, financial reconciliation
Mandatory end-to-end tests
Staff creates a walk-in room booking, records payment, and prints a receipt.
Customer makes an online reservation, pays a deposit, and receives a booking reference.
Two users attempt the same exclusive allocation; only one conflicting allocation is accepted.
A recurring series has one conflict and returns occurrence-level outcomes.
A guest extends a stay and availability, price, and billing are recalculated.
An offline booking syncs and is accepted or explicitly conflicted.
A paid booking is cancelled; invoice, refund, and booking statuses remain accurate.
A resource enters maintenance and affected reservations are handled according to policy.
A long-term rental is extended without duplicating rent or financial records.
An unauthorized user attempts a cross-branch read, price override, or refund and is rejected/audited.
12. Release strategy and MVP
Release 1 — Core engine and staff operations
Include:
One profile fully implemented end-to-end.
Resource management and allocation engine.
Staff calendar and booking management.
Basic rate plans and quotes.
Existing customer, invoice, and payment integration.
Permissions, audit, and document printing.
Concurrency and financial correctness tests.
Recommended starting profile: meeting rooms or another straightforward scheduled-resource use case. Add hotel stay semantics as a profile rather than forcing them into the first implementation.
Release 2 — Offline staff booking
Add:
Local persistence.
Walk-in workflow.
Outbox synchronization.
Conflict resolution.
Offline receipt generation.
Release 3 — Online storefront
Add:
Customer search and availability.
Quote and hold.
Checkout/payment.
Customer booking history and eligible changes.
Release 4 — Industry profiles and advanced operations
Add:
Hotel housekeeping and guest operations.
Equipment handover/returns.
Long-term rental agreements and recurring rent.
Advanced reporting and optional external integrations.
Defer marketplace commissions, advanced dynamic pricing, third-party channel synchronization, and AI recommendations until the core lifecycle is stable.
13. Risks and mitigations
Risk
Mitigation
Double booking
Authoritative transactional allocation, conflict recheck, concurrency tests
SQLite concurrency limitations
Separate local persistence from shared online allocation authority
Over-generalized schema
Shared core plus profile-specific configuration and operations
Financial inconsistency
Reuse billing/payment services and explicit allocations
Duplicate business logic
Central domain services; hooks handle UI state and requests
Recurrence edge cases
Persist occurrence records and define edit/conflict semantics
Offline conflicts
Idempotency, server revalidation, visible resolution workflow
Excessive initial scope
Ship one complete profile before adding all profiles
Duplicate background work
Idempotent Inngest handlers and unique operation/event IDs
Reference mismatch
Adopt UX patterns but verify actual reference behavior independently
14. Definition of done
A feature is complete only when the applicable criteria are met.
Architecture
Reuses existing auth, tenant scope, and service conventions.
Has typed contracts and validated inputs.
Does not duplicate existing customer, invoice, payment, or organization models without justification.
Data integrity
Has migrations, indexes, and documented constraints.
Enforces server-side lifecycle and availability rules.
Records audit history and handles retries idempotently.
User experience
Uses existing UI components, forms, and hooks.
Supports loading, empty, error, offline, and permission-denied states.
Works responsively and supports keyboard navigation.
Reliability
Has unit and integration tests.
Has relevant concurrency and failure-path tests.
Has logs and recovery instructions for critical workflows.
15. Engineering execution checklist
[ ]
Audit repository and map existing POS/accounting infrastructure.
[ ]
Finalize domain, lifecycle, recurrence, and concurrency contracts.
[ ]
Add Prisma models, migrations, constraints, and seed data.
[ ]
Implement resource management and authoritative availability.
[ ]
Add conflict/concurrency tests before confirmation workflows.
[ ]
Build shared calendar, forms, hooks, and staff dashboard.
[ ]
Implement pricing, lifecycle, approvals, and recurrence.
[ ]
Integrate existing customer, invoice, payment, and document services.
[ ]
Add offline persistence and synchronization.
[ ]
Build storefront and customer portal.
[ ]
Add check-in/out, housekeeping, asset rental, and long-term rental operations.
[ ]
Complete reporting, security, observability, and staged rollout.
16. Final architecture decisions
One booking domain: room, stay, asset, and property profiles share core allocation and lifecycle infrastructure.
One authoritative allocator per deployment: online confirmation must revalidate conflicts inside the authoritative transaction.
One pricing service: profile-specific rate rules feed a shared quote and price-snapshot mechanism.
One billing integration: use existing accounts, invoices, payments, refunds, and accounting services.
Multiple interfaces: staff dashboard, offline workflow, public storefront, and customer portal call the same domain services.
Inngest is for durable workflows, not availability truth.
Offline claims remain honest: a disconnected device cannot guarantee global exclusivity without a shared authority.
Implement one profile end-to-end first: extend after its data integrity, billing, UI, and recovery paths pass tests.
This PRD is the implementation baseline. The first engineering action is Phase 0: inspect the existing repository and produce the reuse/integration map before generating migrations or creating booking-specific abstractions.

make sure everything is working smoothly and perfectly on existing infra stack as well it is configured this features by admin/owner 
as well customizable from dashboard of admin/owner make sure it adopt same booking Room booking view screens , booking view tracking
search and filter and so on. it implement without breaking or hamper any features or service of platform application and implemented by agents and there mcp and skill usages or harness

