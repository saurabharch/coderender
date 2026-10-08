
Plan 1

Worked for 23s

Yes. I analyzed the master branch of your saurabharch/tailpos repository and the upstream TailPOS architecture. The important point is that you should not port TailPOS literally; instead, use its functional model and redesign it around your existing Next.js + Prisma + SQLite + Inngest + online SaaS/e-commerce architecture.

TailPOS provides the core reference set you want: offline-first POS, two-way synchronization, mobile POS, camera/Bluetooth barcode scanning, ESC/POS printing, multiple payment modes, discounts, inventory, and X/Z/shift reporting. 

Your application can go considerably further because you already have the broader business platform around it.


---

1. Target product architecture

I would turn your application into a Unified Business OS rather than simply another POS.

┌─────────────────────────┐
                         │       CLOUD PLATFORM    │
                         │                         │
                         │ Next.js Web              │
                         │ Prisma                  │
                         │ SQLite/Postgres*        │
                         │ Inngest                 │
                         │ Redis                   │
                         │ Object Storage          │
                         │ Notification Engine     │
                         │ Agentic AI              │
                         └────────────┬────────────┘
                                      │
                         Sync / API / Events
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
   ┌──────▼───────┐           ┌──────▼───────┐           ┌──────▼───────┐
   │ Android POS  │           │ iOS POS      │           │ Desktop POS  │
   │              │           │              │           │              │
   │ SQLite       │           │ SQLite       │           │ SQLite       │
   │ Offline      │           │ Offline      │           │ Offline      │
   │ Barcode      │           │ Barcode      │           │ Barcode      │
   │ Printer      │           │ Printer      │           │ Printer      │
   │ Cash/UPI     │           │ Payments     │           │ USB/BLE      │
   └──────────────┘           └──────────────┘           └──────────────┘

And separately:

ONLINE BUSINESS
                          │
         ┌────────────────┼─────────────────┐
         │                │                 │
      Website          E-commerce        Business
      Profile          Storefront        Profile
         │                │                 │
         └────────────────┼─────────────────┘
                          │
                    AI Business Agent
                          │
                ┌─────────┴─────────┐
                │                   │
             Customer             Lead
              Chat                Automation

AI Agent = online business only.

Offline POS should not depend on AI availability.


---

2. What I found in TailPOS

Your repository is essentially the TailPOS React Native architecture.

The repository separates POS functionality into stores such as:

- AttendantStore
- CategoryStore
- CustomerStore
- DiscountStore
- ItemStore
- PaymentStore
- PrinterStore
- ReceiptStore
- RoleStore
- ShiftStore
- ShiftReportsStore
- TaxesStore
- SyncStore

and has background synchronization through syncInBackground.js. 

There are also dedicated containers for:

Sales
Payment
Receipts
Receipt Info
Shifts
Shift Reports
Settings
Login
Customers

The old implementation uses React Native, MobX, PouchDB/SQLite, native camera/barcode functionality, Bluetooth, NFC and ESC/POS-related functionality. 

So functionally, it gives us an excellent POS capability checklist.


---

3. Important licensing point

Your repository declares GPL-3.0. 

Therefore I recommend:

> Do not copy TailPOS source code into your new proprietary/commercial platform.



Instead:

- use the repository to understand functionality
- derive your own requirements
- implement your own architecture
- write new TypeScript/React code
- use your own database model
- use your own synchronization protocol
- use your own UI

If you intend to reuse actual TailPOS GPL code, the licensing consequences need to be reviewed separately.

This is particularly important if your larger platform is intended to be a commercial SaaS.


---

4. Feature mapping

I would expand the TailPOS feature set as follows.

TailPOS	Your new platform

Sales	POS Sales
Items	Product Catalog
Categories	Categories
Customer	Customer/CRM
Discounts	Promotions/Pricing
Taxes	Tax Engine
Payments	Payment Engine
Receipt	Invoice/Bill/Receipt
Inventory	Inventory + Warehouse
Shift	POS Shift
Attendant	Employee/Cashier
Reports	Business Analytics
Printer	Printer/Device Manager
Barcode	Barcode/Scanner Engine
Offline sync	Offline Sync Engine
ERPNext sync	Your Cloud Sync
Background jobs	Inngest
Notifications	Notification Engine
—	Credit Ledger
—	Subscription
—	E-commerce
—	Business Profile
—	Lead Automation
—	Website
—	Agentic AI
—	Marketplace
—	Accounting
—	Customer Portal


This makes your platform much more powerful than TailPOS.


---

5. Core product modules

I recommend this module hierarchy.

Business OS
│
├── Business Profile
│
├── POS
│   ├── Sales
│   ├── Returns
│   ├── Exchange
│   ├── Discounts
│   ├── Taxes
│   ├── Payments
│   ├── Receipts
│   ├── Credit Sales
│   └── Refunds
│
├── Inventory
│   ├── Products
│   ├── Variants
│   ├── SKU
│   ├── Barcode
│   ├── Stock
│   ├── Warehouses
│   ├── Transfers
│   ├── Purchase
│   ├── Adjustments
│   └── Stock Ledger
│
├── Customers
│   ├── Profiles
│   ├── Purchase History
│   ├── Credit Ledger
│   ├── Repayments
│   └── Customer Groups
│
├── Billing
│   ├── Invoice
│   ├── Bill
│   ├── Receipt
│   ├── Credit Note
│   └── Debit Note
│
├── Subscriptions
│   ├── Plans
│   ├── Customer Subscription
│   ├── Renewal
│   └── Payment
│
├── Business Online
│   ├── Website
│   ├── Store
│   ├── Product Catalog
│   ├── Business Profile
│   └── SEO
│
├── CRM
│   ├── Leads
│   ├── Contacts
│   ├── Pipelines
│   ├── Tasks
│   └── Automation
│
├── Communication
│   ├── WhatsApp
│   ├── Telegram
│   ├── Email
│   └── Attachments
│
├── AI
│   ├── Business Agent
│   ├── Customer Chat
│   ├── Product Assistant
│   ├── Order Assistant
│   └── Lead Assistant
│
└── Reports
    ├── Sales
    ├── Inventory
    ├── Customer
    ├── Credit
    ├── Subscription
    ├── Profit
    └── POS Shift


---

6. Offline POS should be a completely independent runtime

This is the most important architectural decision.

Don't build:

POS → Next.js API → SQLite

because then POS stops working when the network disappears.

Instead:

POS UI
   ↓
Local Repository
   ↓
Local SQLite
   ↓
Outbox
   ↓
Sync Engine
   ↓
Cloud API
   ↓
Prisma Database

When online:

Local SQLite
      ↓
Sync
      ↓
Cloud

When offline:

POS
 ↓
SQLite
 ↓
Outbox

No server dependency.


---

7. SQLite design

Your device database should contain only data required to operate the business.

Local tables

Business
Store
Device
Employee
Customer
CustomerCredit
Product
ProductVariant
Category
Price
Tax
Discount
Inventory
InventoryLedger
Warehouse
POSSession
POSShift
Cart
Sale
SaleItem
SalePayment
Invoice
InvoiceItem
Receipt
CreditSale
CreditPayment
Subscription
SubscriptionPayment

SyncOutbox
SyncInbox
SyncCursor
SyncConflict
SyncError
DeviceSetting
Printer
Barcode


---

8. Don't make Prisma the browser database

This is an important technical distinction.

Prisma should be your server-side database abstraction.

For example:

Next.js Server
       ↓
Prisma
       ↓
Cloud DB

But mobile/browser runtime cannot simply run normal Prisma Client against a local SQLite file.

Therefore use an abstraction:

interface BusinessRepository {
  products: ProductRepository
  customers: CustomerRepository
  sales: SalesRepository
  inventory: InventoryRepository
  payments: PaymentRepository
  invoices: InvoiceRepository
}

Then implementations:

CloudRepository
      ↓
Prisma

MobileSQLiteRepository
      ↓
Native SQLite

DesktopSQLiteRepository
      ↓
SQLite

WebOfflineRepository
      ↓
IndexedDB / SQLite WASM

This lets your business logic remain shared.


---

9. Shared domain layer

This is where I would put the majority of your business logic.

packages/
│
├── domain/
│   ├── sales/
│   ├── inventory/
│   ├── billing/
│   ├── customers/
│   ├── payments/
│   ├── credit/
│   ├── subscriptions/
│   ├── tax/
│   └── pricing/
│
├── contracts/
│   ├── sales.ts
│   ├── inventory.ts
│   ├── sync.ts
│   └── notifications.ts
│
├── sync/
│   ├── outbox/
│   ├── inbox/
│   ├── conflict/
│   ├── cursor/
│   └── protocol/
│
├── ui/
│
└── validation/

This is critical for Android, iOS, desktop and web consistency.


---

10. Offline transaction model

A sale should be committed locally as one atomic operation.

Example:

START TRANSACTION

Create Sale
Create SaleItems
Create Payment
Create Receipt
Create InventoryLedger
Update Inventory
Create SyncOutbox

COMMIT

Never do:

Sale created
↓
internet request
↓
inventory update

because that will fail offline.

Instead:

SQLite transaction
      ↓
everything committed
      ↓
sync later


---

11. Sale state machine

Use explicit states.

DRAFT
  ↓
CONFIRMED
  ↓
PAID
  ↓
COMPLETED
  ↓
SYNC_PENDING
  ↓
SYNCED

Failure:

SYNC_PENDING
      ↓
SYNC_FAILED
      ↓
RETRY

Don't modify completed sales silently.

Use:

RETURN
REFUND
CREDIT_NOTE
ADJUSTMENT

for corrections.


---

12. Offline sync engine

This is where your new system can significantly improve TailPOS.

Use an event/outbox model.

Local

SyncOutbox

id
deviceId
businessId
storeId
entityType
entityId
operation
payload
version
createdAt
attemptCount
status
lastError

Example:

{
  "entity": "SALE",
  "entityId": "sale_01",
  "operation": "CREATE",
  "version": 1
}


---

13. Sync protocol

Use:

POST /api/sync/push

for local → cloud.

And:

GET /api/sync/pull?cursor=...

for cloud → local.

Or preferably:

POST /api/sync
{
  push: [...],
  cursor: "..."
}

Response:

{
  "accepted": [],
  "rejected": [],
  "changes": [],
  "nextCursor": "..."
}


---

14. Idempotency

Every offline transaction needs:

businessId
deviceId
transactionId
operationId
clientCreatedAt

For example:

sale_01JXYZ...

The server must be able to receive the same transaction five times without creating five sales.

Use:

UNIQUE(
  businessId,
  deviceId,
  operationId
)

This is essential.


---

15. Conflict resolution

Don't use simple:

last-write-wins

for financial transactions.

Instead:

Product

Last-write-wins can be acceptable.

Customer

Merge/version based.

Inventory

Ledger-based.

Sale

Immutable.

Payment

Immutable.

Credit repayment

Immutable.

Invoice

Versioned.

Therefore:

Inventory
   ↓
Ledger
   ↓
Calculated balance

rather than trusting one mutable quantity.


---

16. Multi-device synchronization

Imagine:

Store A

POS-01
POS-02
POS-03

All are offline.

Each creates:

POS-01 → SALE-001
POS-02 → SALE-001

Do not use sequential invoice numbers generated locally without a strategy.

Use:

Device ID
+
local sequence
+
server invoice number

Example:

INV-MAIN-01-000123
INV-MAIN-02-000087

Then optionally assign a canonical server invoice number during synchronization.


---

17. Inventory synchronization

This deserves special attention.

Don't sync:

stock = 95

as the primary truth.

Sync:

StockMovement

such as:

PURCHASE +100
SALE -2
SALE -3
RETURN +1
ADJUSTMENT -1

Then:

Opening
+
Movements
=
Stock

This dramatically improves offline consistency.


---

18. POS capabilities

Your new POS should contain:

Product

- product search
- category
- SKU
- barcode
- variant
- unit
- batch
- serial
- expiry
- MRP
- selling price
- purchase price
- tax
- discount
- stock
- image

Cart

- add
- remove
- quantity
- notes
- item discount
- bill discount
- coupon
- tax
- customer
- hold cart
- resume cart

Payment

Cash
UPI
Card
Bank Transfer
Wallet
Credit
Split Payment
Other

TailPOS itself supports multiple payment modes and discounts, so these belong in your baseline POS scope. 


---

19. Credit-sale system

This should be one of your major differentiators.

Customer
   ↓
Credit Account
   ↓
Credit Sale
   ↓
Outstanding
   ↓
Repayment

Example:

Invoice       ₹2,500
Paid          ₹1,000
Credit        ₹1,500

Later:

Repayment
₹500

Balance:

₹1,000

Every repayment creates a ledger entry.


---

20. Credit reminder notifications

You specifically requested notifications only for specific business events.

I would enforce this at the notification policy layer.

Allowed

Invoice
Bill
Receipt
Credit repayment
Subscription renewal

Channels

WhatsApp
Telegram
Email

Attachments

PDF invoice
PDF bill
PDF receipt
Payment receipt
Credit statement
Subscription invoice

So:

Sale
 ↓
Invoice generated
 ↓
NotificationIntent
 ↓
Inngest
 ↓
WhatsApp / Email / Telegram


---

21. Notification architecture

Do not let POS directly call WhatsApp.

Use:

Business Event
      ↓
Notification Policy
      ↓
Notification Outbox
      ↓
Inngest
      ↓
Provider Adapter
      ↓
WhatsApp / Telegram / Email

Example:

NotificationEvent = {
  type: "INVOICE_CREATED",
  businessId,
  customerId,
  documentId,
  attachmentId
}

Then policy:

INVOICE_CREATED
→ WhatsApp
→ Email
→ Telegram

depending on customer/business configuration.


---

22. Attachments

Use object storage.

Your architecture could use:

MinIO
R2
S3
Supabase Storage

depending on deployment.

Database stores:

Attachment
----------------
id
businessId
entityType
entityId
storageKey
mimeType
size
checksum
createdAt

Don't put PDFs directly inside SQLite.

Offline:

Generate document
 ↓
Store locally
 ↓
Mark attachment pending
 ↓
Upload after connection


---

23. Inngest's role

Inngest should not be the offline queue.

Instead:

Offline device
     ↓
Local SQLite Outbox
     ↓
Internet restored
     ↓
Sync API
     ↓
Cloud transaction
     ↓
Inngest Event

Inngest handles cloud jobs such as:

invoice.generate
receipt.generate
attachment.upload
notification.send
subscription.renewal
credit.reminder
lead.followup
email.send
whatsapp.send
telegram.send
analytics.update
search.index

This gives you two queue layers:

DEVICE
SQLite Outbox
       ↓
CLOUD
Inngest

That's the correct architecture.


---

24. Inngest workflows

For example:

sale.completed
       │
       ├── generate invoice
       │
       ├── generate receipt
       │
       ├── update accounting
       │
       ├── update analytics
       │
       └── send notification

Subscription:

subscription.renewal_due
       ↓
generate invoice
       ↓
payment reminder
       ↓
WhatsApp
       ↓
Email
       ↓
Telegram

Credit:

credit.payment.created
       ↓
update ledger
       ↓
generate receipt
       ↓
send receipt


---

25. Lead automation

This belongs exclusively to your online/cloud business layer.

Example:

Lead created
     ↓
Qualification
     ↓
Automation
     ↓
Task
     ↓
Reminder
     ↓
Email / WhatsApp
     ↓
Sales pipeline

You can support:

Lead Created
Lead Updated
Lead Qualified
Lead Assigned
No Response
Follow-up Due
Deal Created
Deal Won
Deal Lost

Then:

Trigger
 ↓
Conditions
 ↓
Actions

Very similar to the automation architecture you've been planning.


---

26. Online AI Agent

The AI agent should only be available when the business has online/cloud capabilities enabled.

Architecture:

Customer
   ↓
Business Website
   ↓
AI Chat
   ↓
Agent Orchestrator
   ↓
Business Tools

Tools:

searchProducts()
getProduct()
checkAvailability()
getBusinessInfo()
createLead()
createOrder()
getOrderStatus()
getShippingInfo()
bookAppointment()
createSupportRequest()

The agent should not directly manipulate financial records.

Use controlled tools:

AI
 ↓
Tool
 ↓
Authorization
 ↓
Business Service
 ↓
Database


---

27. AI should not exist in offline POS

Your requirement is correct:

> Offline business → no agentic AI.



The offline application can still provide:

Search
Barcode
Pricing
Inventory
Customer lookup
Sales
Reports

But:

AI chat
LLM
agent orchestration

remain cloud-only.

This dramatically reduces device complexity.


---

28. Online e-commerce

Your existing application can expose:

business.com

or:

business.yourplatform.com

with:

Business Profile
     │
     ├── About
     ├── Contact
     ├── Location
     ├── Products
     ├── Services
     ├── Offers
     ├── Reviews
     └── Social Links

And:

/store

for e-commerce.


---

29. Unified product catalog

The same product should be usable by:

POS
│
├── Offline sale
├── Online sale
├── E-commerce
├── Invoice
├── Inventory
├── Subscription
├── Marketplace
└── AI Agent

Example:

Product
 ├── SKU
 ├── Variant
 ├── Price
 ├── Inventory
 ├── Tax
 ├── Images
 ├── SEO
 └── OnlineVisibility

This prevents maintaining separate POS and e-commerce catalogs.


---

30. Device architecture

I recommend:

Android

Capacitor + native plugins

Next.js UI
   ↓
Capacitor
   ↓
Android Native
   ↓
SQLite

Useful native capabilities:

Camera
Barcode
Bluetooth
USB
Printer
NFC
Files
Notifications
Biometrics


---

31. iOS

Same application:

Next.js UI
   ↓
Capacitor
   ↓
iOS Native
   ↓
SQLite

Native integrations:

Camera
Bluetooth
AirPrint / supported printers
NFC where applicable
Files
Biometrics
Push notifications

Be careful that hardware support differs between Android and iOS.


---

32. Desktop

For desktop POS I recommend Tauri rather than forcing the mobile runtime onto desktop.

Next.js
   ↓
Tauri
   ↓
Rust
   ↓
SQLite

This gives:

Windows
macOS
Linux

with a lightweight desktop client.

For POS hardware:

USB barcode scanner
USB printer
Bluetooth printer
Cash drawer
Keyboard
Customer display

Desktop is particularly important for retail shops.


---

33. Web/PWA

You should also provide:

https://app.yourdomain.com

with offline capabilities.

But don't promise identical hardware functionality to the desktop application.

Web:

POS
Inventory
Orders
Customers
Reports
Billing

Desktop:

POS
+
USB
+
Bluetooth
+
ESC/POS
+
Cash Drawer

Mobile:

POS
+
Camera
+
Bluetooth
+
Mobile printer


---

34. Application structure

I recommend a monorepo.

/apps
│
├── web
│   └── Next.js
│
├── mobile
│   └── Capacitor
│
├── desktop
│   └── Tauri
│
└── admin
    └── Next.js
│
/packages
│
├── database
│   ├── prisma
│   └── migrations
│
├── domain
│
├── sync
│
├── api
│
├── auth
│
├── billing
│
├── notifications
│
├── documents
│
├── inventory
│
├── pos
│
├── crm
│
├── automation
│
├── ai
│
├── storage
│
├── printer
│
├── barcode
│
└── ui


---

35. Next.js structure

apps/web/src/

app/
├── (auth)/
├── dashboard/
├── pos/
│   ├── terminal/
│   ├── sales/
│   ├── receipts/
│   ├── shifts/
│   └── returns/
│
├── inventory/
├── products/
├── customers/
├── billing/
├── credit/
├── subscriptions/
├── ecommerce/
├── business-profile/
├── crm/
├── automations/
├── notifications/
├── reports/
├── settings/
└── ai/


---

36. Prisma domain architecture

I would split your Prisma schema logically:

schema/
├── tenant.prisma
├── business.prisma
├── users.prisma
├── products.prisma
├── inventory.prisma
├── pos.prisma
├── sales.prisma
├── payments.prisma
├── billing.prisma
├── customers.prisma
├── credit.prisma
├── subscriptions.prisma
├── crm.prisma
├── automation.prisma
├── notification.prisma
├── ecommerce.prisma
├── ai.prisma
├── sync.prisma
└── audit.prisma

Then combine them during generation if required by your Prisma setup.


---

37. Core POS Prisma models

At minimum:

Business
Store
POSDevice
POSProfile
POSSession
POSShift
POSCashier

Product
ProductVariant
ProductBarcode
ProductPrice
ProductTax

InventoryLocation
InventoryStock
InventoryMovement

Customer
CustomerAddress
CustomerCreditAccount
CustomerCreditLedger

Sale
SaleItem
SalePayment
SaleDiscount
SaleTax

Invoice
InvoiceItem

Receipt

Refund
RefundItem

Payment
PaymentAllocation


---

38. Audit architecture

Financial records should have:

createdAt
updatedAt
createdBy
updatedBy
deviceId
businessId
storeId
version

And:

AuditLog

with:

CREATE
UPDATE
VOID
REFUND
PAYMENT
CREDIT
SYNC
LOGIN
SHIFT_OPEN
SHIFT_CLOSE


---

39. POS shift system

TailPOS's X/Z and attendant/shift concepts are worth retaining. 

Implement:

OPEN SHIFT
     ↓
Opening Cash
     ↓
Sales
     ↓
Cash In
Cash Out
Refund
Credit
     ↓
CLOSE SHIFT
     ↓
Expected Cash
Actual Cash
Variance
     ↓
Z Report

Reports:

X Report
Z Report
Cashier Report
Payment Method Report
Sales Report
Tax Report
Discount Report
Refund Report


---

40. Barcode architecture

Support:

EAN-8
EAN-13
UPC-A
UPC-E
Code 128
Code 39
ITF
GS1
QR
Data Matrix

Also support:

internal barcode
weighted barcode
batch barcode
serial barcode

And scanner modes:

Camera
Bluetooth HID
USB HID
Native scanner


---

41. Printer architecture

Don't put printer code inside sales logic.

Use:

PrinterAdapter

Implement:

ESC/POS
BluetoothPrinter
USBPrinter
NetworkPrinter
SystemPrinter
PDFPrinter

Then:

await printer.print(receipt)

The POS doesn't care which printer is attached.


---

42. Receipt generation

Create a shared document renderer:

DocumentTemplate
       ↓
DocumentRenderer
       ↓
PDF
       ↓
Print
       ↓
Email
       ↓
WhatsApp
       ↓
Telegram

Templates:

Invoice
Receipt
Bill
Credit Receipt
Payment Receipt
Subscription Invoice
Credit Statement


---

43. Offline document generation

Offline:

Sale
 ↓
HTML/Template
 ↓
PDF
 ↓
SQLite/local filesystem
 ↓
Print

When online:

Upload attachment
 ↓
Cloud storage
 ↓
Notification

This means the shop can still print a receipt even without internet.


---

44. Online/offline capability matrix

Feature	Offline	Online

POS	✅	✅
Sales	✅	✅
Inventory	✅	✅
Barcode	✅	✅
Customer	✅	✅
Credit	✅	✅
Repayment	✅	✅
Invoice	✅	✅
Receipt	✅	✅
Printing	✅	✅
Shift	✅	✅
Reports	✅	✅
E-commerce	❌	✅
Business profile	cached	✅
Lead automation	❌	✅
WhatsApp	queued	✅
Telegram	queued	✅
Email	queued	✅
Attachments	local	cloud
AI Agent	❌	✅
Online checkout	❌	✅
Marketplace	❌	✅
Cloud analytics	after sync	✅



---

45. Offline notification behavior

This is important.

Suppose a customer purchases on an offline POS.

You cannot actually send WhatsApp immediately.

Instead:

SALE
 ↓
Invoice created
 ↓
NotificationIntent
 ↓
LOCAL_PENDING

After internet:

Sync
 ↓
Cloud receives sale
 ↓
Inngest
 ↓
WhatsApp

Status:

PENDING
QUEUED
SENDING
SENT
FAILED
RETRYING

The UI should clearly show:

> "Receipt will be sent when internet connection is restored."




---

46. Subscription system

Subscriptions belong to the online/cloud layer but their records can be cached locally if necessary.

SubscriptionPlan
Subscription
SubscriptionItem
SubscriptionCycle
SubscriptionInvoice
SubscriptionPayment
SubscriptionRenewal

Renewal flow:

renewal_due
     ↓
invoice
     ↓
payment
     ↓
receipt
     ↓
notification

Allowed notification:

Subscription renewal reminder


---

47. Business profile

Each business gets:

Business Profile
│
├── Logo
├── Name
├── Description
├── Phone
├── Email
├── Address
├── Location
├── Opening Hours
├── Social Links
├── Gallery
├── Products
├── Services
├── Offers
├── Reviews
└── SEO

This becomes the foundation for:

Public business page

and:

AI agent knowledge


---

48. Agentic AI knowledge architecture

Online businesses can expose:

Business
Products
Services
FAQs
Policies
Opening hours
Locations
Offers
Orders
Shipping

to the AI.

Use retrieval:

Customer question
      ↓
Intent
      ↓
Business knowledge
      ↓
Product/order tools
      ↓
Agent response

Not:

LLM → direct SQL


---

49. Security boundary

I strongly recommend:

AI
 ↓
Tool API
 ↓
Authorization
 ↓
Business service
 ↓
Prisma

Never:

AI
 ↓
raw database

Especially for:

payments
refunds
credit
inventory
subscriptions
customer data


---

50. Release strategy

Don't release Android + iOS + desktop + web simultaneously.

Use this sequence.

Release 0 — Foundation

Prisma
SQLite
Auth
Business
Products
Customers
Inventory
Sync

Goal:

> One business can operate offline.




---

51. Release 1 — Offline POS

Ship:

Android
Desktop
Web PWA

Features:

Product
Barcode
Cart
Sale
Payment
Invoice
Receipt
Inventory
Customer
Credit
Shift
Printer
Offline
Sync

This is your first real commercial release.


---

52. Release 2 — Cloud business platform

Add:

Dashboard
Reports
Business profile
Product management
Inventory management
Billing
Customer management
Credit ledger
Subscription
Notification engine


---

53. Release 3 — E-commerce

Add:

Online store
Product pages
Cart
Checkout
Order management
Shipping
Coupons
Customer account
Business profile
SEO


---

54. Release 4 — CRM + automation

Add:

Leads
Contacts
Pipeline
Tasks
Automation
Triggers
Conditions
Actions

For example:

Lead created
 ↓
Wait 1 day
 ↓
If no response
 ↓
Send WhatsApp
 ↓
Create follow-up task


---

55. Release 5 — Agentic AI

Only after the online system is stable.

Add:

AI Business Agent
AI Customer Chat
Product Assistant
Order Assistant
Lead Assistant

The agent should be explicitly marked:

Online AI

and never required by POS.


---

56. Release 6 — iOS

Once Android and desktop hardware integrations are stable:

iOS

with:

Camera
Barcode
Bluetooth
Printer
Offline SQLite
Sync

Don't block the first commercial release waiting for iOS.


---

57. Recommended release order

My preferred sequence:

┌───────────────┐
                    │ Core Platform │
                    └───────┬───────┘
                            │
                 ┌──────────▼──────────┐
                 │ Offline POS Engine  │
                 └──────────┬──────────┘
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
          Android        Desktop          PWA
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                     Cloud Platform
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
             Billing      CRM       E-commerce
                │           │           │
                └───────────┼───────────┘
                            ▼
                     AI Business Agent
                            │
                            ▼
                           iOS


---

58. Version roadmap

I would structure versions approximately like:

v1.0
Offline POS

v1.1
Inventory + barcode + printer

v1.2
Customer credit + repayment

v1.3
Invoice/receipt notification

v1.4
Cloud synchronization

v1.5
Business profile

v1.6
Billing/subscriptions

v2.0
E-commerce

v2.1
CRM

v2.2
Lead automation

v2.5
Agentic AI

v3.0
Full Business OS


---

59. Testing strategy

For an offline POS, normal web testing isn't enough.

You need a dedicated test matrix.

Network

Online
Offline
2G
Poor connection
Connection lost during sale
Connection restored during sync

Device

Android phone
Android tablet
iPhone
iPad
Windows
macOS
Linux

Hardware

Camera scanner
USB scanner
Bluetooth scanner
ESC/POS
Bluetooth printer
USB printer
Network printer
Cash drawer

Sync

1 device
2 devices
5 devices
10 devices
simultaneous sales
duplicate sync
failed sync
partial sync
conflict
server unavailable


---

60. Critical financial tests

You need invariant tests such as:

Invoice total =
sum(line totals)
+ tax
- discount

and:

Outstanding =
Credit
- Repayments
- Adjustments

and:

Stock =
Opening
+ Purchases
+ Returns
- Sales
- Damaged
± Adjustments

and:

Shift expected cash =
Opening cash
+ cash sales
+ cash in
- cash refunds
- cash out

These should be automated tests.


---

61. Deployment architecture

For cloud:

Cloudflare
    │
    ▼
Next.js
    │
    ├── API
    ├── Web
    └── E-commerce
         │
         ▼
      Database
         │
       Prisma
         │
   ┌─────┼──────┐
   ▼     ▼      ▼
 Redis Inngest Storage

And:

Search
Typesense

can remain part of your existing architecture.


---

62. Your existing stack fits this very well

Given the architecture you've been designing, I'd use:

Frontend
Next.js
React
TanStack Query
shadcn/ui
Tailwind
Mantine

Backend
Next.js API / service layer
TypeScript
Prisma

Local
SQLite

Offline sync
Custom Sync Engine
SQLite Outbox

Jobs
Inngest

Cache
Redis

Search
Typesense

Storage
Cloudflare R2 / MinIO / Supabase Storage

Notifications
WhatsApp
Telegram
Email

Desktop
Tauri

Mobile
Capacitor

AI
Online-only Agentic AI


---

63. The most important architectural rule

I would establish this rule before writing any code:

DOMAIN LOGIC
                  │
       ┌──────────┴──────────┐
       │                     │
 LOCAL REPOSITORY       CLOUD REPOSITORY
       │                     │
     SQLite                Prisma
       │                     │
    Device                Server
       │                     │
       └──────────┬──────────┘
                  │
             Sync Protocol

Everything above the repository should be reusable.

That means your:

SaleService
InventoryService
CreditService
BillingService
PricingService
TaxService

shouldn't know whether they are running against local SQLite or the cloud.


---

64. What I would NOT do

I would not build:

Next.js
 ↓
API
 ↓
Cloud DB

as the only POS architecture.

I would not make Inngest responsible for offline work.

I would not make the AI agent part of the offline client.

I would not allow financial transactions to use last-write-wins.

I would not store the complete cloud database on every device.

I would not couple printing to invoice creation.

I would not send WhatsApp directly from POS.

And I would not copy TailPOS GPL source into the new commercial application.


---

65. Final target

The end product becomes:

BUSINESS OS
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
   OFFLINE POS       ONLINE BUSINESS    AI AGENT
       │                 │                 │
       │                 │                 │
   Android             Website          Customer Chat
   iOS                 E-commerce       Product Agent
   Windows             CRM              Order Agent
   macOS               Billing          Lead Agent
   Linux               Automation
       │                 │
       └─────────┬───────┘
                 │
             CLOUD SYNC
                 │
        ┌────────┼─────────┐
        │        │         │
      Prisma   Inngest   Storage
        │        │         │
        DB     Jobs    Attachments

The key differentiation is that the same business can run completely offline at the shop, then become a full online business when connected—without maintaining two separate products.

And compared with TailPOS, you're effectively taking its proven offline POS + synchronization model and expanding it into POS + inventory + billing + credit ledger + subscriptions + e-commerce + business profile + CRM + automations + online-only agentic AI. TailPOS already demonstrates the viability of the offline POS portion, including background synchronization and device-oriented POS functionality. 

[Your TailPOS repository](https://github.com/saurabharch/tailpos/tree/master?utm_source=chatgpt.com)

Recommended next engineering step


The next artifact I would create is a complete implementation specification, in this order:

1. Full Prisma schema — roughly 100–150 models covering POS, inventory, billing, credit, subscriptions, CRM, automation, e-commerce, notifications, sync and AI.
2. Local SQLite schema — optimized subset for Android/iOS/Desktop/PWA.
3. Offline Sync Protocol v1 — outbox/inbox, cursors, idempotency, versioning and conflict resolution.
4. POS service layer — sale, return, payment, credit, inventory, shift and receipt transactions.
5. Inngest event/workflow specification — all cloud-side jobs.
6. Notification provider abstraction — WhatsApp/Telegram/email + PDF attachments.
7. Next.js folder/module architecture.
8. Capacitor Android/iOS architecture.
9. Tauri Windows/macOS/Linux architecture.
10. Release/CI-CD pipeline for Web → Android → iOS → Windows → macOS → Linux.
11. Complete MVP → V1 → V2 feature roadmap with development dependencies and acceptance criteria.



Plan 2

The previous plan into a complete omnichannel POS + Business OS specification, with printing, barcode, PDF, offline synchronization, hardware, web/PWA, Android, iOS and desktop treated as first-class requirements.

One important correction to the architecture: a browser cannot reliably control every USB/Bluetooth/thermal/dot-matrix printer directly. Web Serial, WebUSB and Web Bluetooth exist, but their browser/device support is limited and they require secure contexts/permissions.  Therefore the product should have a universal print abstraction + browser system-print fallback + optional local Print Bridge + native hardware adapters.


---

1. Final product architecture

Your product should become:

BUSINESS OS
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
       ▼                      ▼                      ▼
   OFFLINE POS           ONLINE BUSINESS         AI AGENT
       │                      │                      │
       │                      │                      │
 Android / iOS           E-Commerce              Customer Chat
 Windows/macOS/Linux     Business Profile        Product Agent
 Web/PWA                 CRM                     Order Agent
       │                 Automation              Lead Agent
       │                 Subscriptions
       │
       └──────────────────────┬──────────────────────┘
                              │
                         SYNC ENGINE
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
                 Prisma    Inngest   Storage
                    │         │         │
                    ▼         ▼         ▼
                  Cloud     Jobs      PDF/Files

The fundamental principle:

> POS must remain fully functional without the cloud.



Internet availability should enhance the product, not determine whether the shop can sell.


---

2. Complete technology architecture

I recommend:

Layer	Technology

Web	Next.js
UI	shadcn/ui + Tailwind + Mantine
State	Zustand
Server state	TanStack Query
Validation	Zod
ORM	Prisma
Cloud DB	Your selected production SQL database
Local DB	SQLite
Offline web	IndexedDB/SQLite-WASM strategy
Mobile	Capacitor
Desktop	Tauri
Background jobs	Inngest
Cache	Redis
Search	Typesense
Object storage	R2 / S3 / MinIO
PDF	Server + client PDF renderer
Printing	Universal Print Engine
Barcode	Barcode Engine
Sync	Custom bidirectional sync
Auth	Your existing auth architecture
AI	Online-only agentic layer


Capacitor is particularly suitable for your web-first approach because it provides native Android/iOS runtimes and a plugin mechanism for native functionality. 


---

3. Monorepo

Use:

/business-os
│
├── apps/
│   ├── web/
│   ├── mobile/
│   ├── desktop/
│   └── admin/
│
├── packages/
│   ├── ui/
│   ├── domain/
│   ├── database/
│   ├── sync/
│   ├── pos/
│   ├── inventory/
│   ├── billing/
│   ├── payments/
│   ├── customers/
│   ├── credit/
│   ├── subscriptions/
│   ├── ecommerce/
│   ├── crm/
│   ├── automation/
│   ├── notification/
│   ├── documents/
│   ├── pdf/
│   ├── barcode/
│   ├── printing/
│   ├── hardware/
│   ├── storage/
│   ├── ai/
│   └── contracts/
│
├── prisma/
│
├── inngest/
│
└── tooling/


---

4. Domain architecture

The most important package is:

packages/domain

It contains business rules, not UI.

domain/
├── sales/
├── inventory/
├── pricing/
├── taxes/
├── payments/
├── billing/
├── credit/
├── subscriptions/
├── customers/
├── shifts/
├── returns/
├── refunds/
└── accounting/

For example:

createSale()
completeSale()
returnSale()
createCreditSale()
recordCreditRepayment()
calculateTax()
calculateDiscount()
calculateInventoryMovement()
closeShift()

These services must work identically on:

Web
Android
iOS
Windows
macOS
Linux


---

5. Repository abstraction

Do not couple your domain services directly to Prisma.

Use:

interface ProductRepository {}

interface SaleRepository {}

interface InventoryRepository {}

interface CustomerRepository {}

interface PaymentRepository {}

Implement:

CloudRepository
      ↓
Prisma

DesktopRepository
      ↓
SQLite

MobileRepository
      ↓
SQLite

WebOfflineRepository
      ↓
IndexedDB / SQLite-WASM

Therefore:

SaleService
    │
    └── SaleRepository
           │
           ├── Cloud
           └── Local

This is the foundation of the entire offline architecture.


---

6. Prisma data model

The complete cloud database should cover these domains.

Tenant

Organization
Business
BusinessBranch
BusinessSettings
BusinessBrand
BusinessAddress
BusinessContact
BusinessTaxProfile
BusinessDocumentSequence

Users

User
Employee
Role
Permission
UserRole
EmployeeBranch
EmployeeDevice

Products

Product
ProductVariant
ProductOption
ProductOptionValue
ProductBarcode
ProductCategory
ProductBrand
ProductUnit
ProductPrice
ProductPriceHistory
ProductImage
ProductTax
ProductBatch
ProductSerialNumber
ProductWarranty

Inventory

Warehouse
WarehouseLocation
InventoryStock
InventoryMovement
InventoryTransfer
InventoryAdjustment
StockCount
StockCountItem
PurchaseOrder
PurchaseOrderItem
GoodsReceipt
GoodsReceiptItem
Supplier
SupplierProduct

POS

POSDevice
POSProfile
POSRegister
POSSession
POSShift
POSCashier
POSCashMovement
POSCart
POSCartItem

Sales

Sale
SaleItem
SaleItemTax
SaleDiscount
SalePayment
SaleReturn
SaleReturnItem
Refund
RefundItem

Billing

Invoice
InvoiceItem
InvoiceTax
InvoiceDiscount
CreditNote
DebitNote
Receipt
ReceiptItem
DocumentSequence

Customer credit

CustomerCreditAccount
CustomerCreditLedger
CreditSale
CreditRepayment
CreditAdjustment
CreditLimit

Subscription

SubscriptionPlan
Subscription
SubscriptionItem
SubscriptionCycle
SubscriptionInvoice
SubscriptionPayment
SubscriptionRenewal


---

7. CRM

Lead
LeadSource
LeadStatus
LeadStage
LeadActivity
LeadNote
LeadAssignment
Contact
Deal
DealStage
Task
TaskAssignment


---

8. Automation

Automation
AutomationTrigger
AutomationCondition
AutomationAction
AutomationExecution
AutomationExecutionLog
AutomationVariable
AutomationTemplate

Example:

TRIGGER:
Invoice created

CONDITION:
Invoice amount > ₹5,000

ACTION:
Generate PDF
Send WhatsApp
Send Email


---

9. Notification models

NotificationTemplate
NotificationPolicy
NotificationRecipient
NotificationEvent
NotificationJob
NotificationDelivery
NotificationAttachment
NotificationProvider

Provider abstraction:

interface NotificationProvider {
  send(message: NotificationMessage): Promise<DeliveryResult>
}

Implement:

WhatsAppProvider
TelegramProvider
EmailProvider


---

10. Attachment system

Everything should use a common attachment model.

Attachment
AttachmentVersion
AttachmentReference
StorageObject

Supported:

PDF
PNG
JPEG
WEBP
CSV
XLSX

Examples:

Invoice PDF
Receipt PDF
Credit statement
Payment receipt
Subscription invoice
Barcode sheet
Product label


---

11. POS feature specification

The POS screen should be designed around extremely fast operation.

┌────────────────────────────────────────────────────┐
│ Business       Register 01       Cashier    Online │
├────────────────────────────────────────────────────┤
│ Search / Scan Barcode                              │
├───────────────────────┬────────────────────────────┤
│ Categories            │ Cart                       │
│                       │                            │
│ Grocery               │ Product A       ₹100      │
│ Electronics           │ Product B       ₹250      │
│ Clothing              │ Product C       ₹500      │
│ Services              │                            │
│                       │                            │
│ [Products...]         │ Subtotal        ₹850      │
│                       │ Discount         ₹50       │
│                       │ Tax              ₹144      │
│                       │ Total            ₹944      │
│                       │                            │
│                       │ [PAY] [HOLD] [CLEAR]      │
└───────────────────────┴────────────────────────────┘


---

12. POS operations

Must support:

Sale

Add product
Scan barcode
Change quantity
Change price
Item discount
Bill discount
Coupon
Tax
Customer
Notes

Cart

New cart
Hold cart
Resume cart
Merge cart
Split cart
Clear cart

Payment

Cash
UPI
Card
Bank transfer
Wallet
Credit
Gift card
Other
Split payment

After payment

Invoice
Receipt
Print
PDF
WhatsApp
Telegram
Email
Download


---

13. Returns/refunds

Support:

Full return
Partial return
Exchange
Refund
Store credit
Credit note

Never mutate the original sale.

Use:

Original Sale
       ↓
Return
       ↓
Inventory Movement
       ↓
Refund


---

14. Credit billing

Your credit system should be much stronger than a basic POS.

Customer
   ↓
Credit Account
   ↓
Credit Sale
   ↓
Outstanding
   ↓
Repayment

Ledger:

SALE              + ₹5,000
REPAYMENT         - ₹1,000
REPAYMENT         - ₹1,500
ADJUSTMENT        - ₹200
-------------------------
OUTSTANDING       ₹2,300

Each repayment generates:

Payment Receipt

and can trigger:

WhatsApp
Email
Telegram

with the receipt attachment.


---

15. Barcode engine

Make barcode functionality a dedicated package:

packages/barcode

Support:

Product barcodes

EAN-8
EAN-13
UPC-A
UPC-E
Code 39
Code 93
Code 128
ITF
GS1-128
GS1 DataBar
QR Code
Data Matrix

Business barcodes

SKU barcode
Internal barcode
Batch barcode
Serial barcode
Inventory barcode
Customer barcode
Invoice barcode
Payment barcode


---

16. Barcode scanning

Support:

Camera
USB scanner
Bluetooth scanner
Keyboard/HID scanner
Native mobile scanner

The POS should treat all scanners identically:

interface BarcodeScanner {
  connect(): Promise<void>
  scan(): Promise<BarcodeResult>
  disconnect(): Promise<void>
}


---

17. Camera scanner

Android/iOS:

Camera
 ↓
Barcode detection
 ↓
Normalize
 ↓
Product lookup
 ↓
Add to cart

For high-speed retail environments, camera scanning should not be the only option.


---

18. USB/Bluetooth scanners

Most POS barcode scanners behave as HID keyboards.

That means the best case is:

Scanner
 ↓
Keyboard input
 ↓
Focused POS input
 ↓
Barcode lookup

No special API is necessary.

For scanners exposing serial/Bluetooth protocols, use native adapters.


---

19. Barcode generation

The barcode service:

generateBarcode({
  type: "EAN13",
  value: "890123456789"
})

returns:

SVG
PNG
PDF
ZPL
EPL
ESC/POS

where supported by the target printer.


---

20. Barcode label designer

This should be a visual designer.

┌───────────────────────────────┐
│       PRODUCT NAME            │
│                               │
│      █ ███ ██ █ ████         │
│      890123456789             │
│                               │
│       ₹1,299                  │
└───────────────────────────────┘

Allow:

Logo
Product name
SKU
Barcode
QR
Price
MRP
Tax
Batch
Expiry
Variant
Custom text


---

21. Label sizes

Support presets:

25 × 15 mm
30 × 20 mm
40 × 20 mm
50 × 25 mm
50 × 30 mm
60 × 30 mm
70 × 30 mm
80 × 40 mm
100 × 50 mm
A4 labels
A5 labels
Custom

Also allow:

columns
rows
horizontal gap
vertical gap
margin
bleed


---

22. Printing must be its own subsystem

Create:

packages/printing

Architecture:

PrintDocument
      ↓
PrintRenderer
      ↓
PrintJob
      ↓
PrinterAdapter

Printer adapters:

SystemPrinterAdapter
PDFPrinterAdapter
BrowserPrinterAdapter
ESCPosPrinterAdapter
USBPrinterAdapter
BluetoothPrinterAdapter
NetworkPrinterAdapter
LabelPrinterAdapter


---

23. Printer types

You specifically asked for broad printer support.

Support the following categories.

Printer	Strategy

Thermal	ESC/POS/native
POS thermal	ESC/POS
Inkjet	OS print
Laser	OS print
Color inkjet	OS print
Color laser	OS print
Dot matrix	OS/spooler
Label printer	Native/raw protocol
A4 printer	PDF/system print
A5 printer	PDF/system print
Network printer	OS/network adapter
USB printer	OS/native adapter
Bluetooth printer	Native adapter
Wi-Fi printer	Native/network
PDF printer	PDF export
Virtual printer	OS print



---

24. Critical printer principle

Don't try to send raw ESC/POS commands to an inkjet or laser printer.

Instead:

Thermal:
Document
 ↓
ESC/POS
 ↓
Printer

while:

Laser / Inkjet / Dot Matrix:
Document
 ↓
PDF / OS print job
 ↓
Operating System spooler
 ↓
Printer

This makes your architecture universal.


---

25. Universal print pipeline

PrintRequest
                              │
                ┌─────────────┴─────────────┐
                │                           │
          Printer Type                 Output Type
                │                           │
        ┌───────┼───────┐           ┌───────┼───────┐
        ▼       ▼       ▼           ▼       ▼       ▼
      Thermal   A4     Label        PDF     Print   Preview
        │       │       │
      ESC/POS  PDF   Label Protocol


---

26. Paper size engine

Support:

Standard

A0
A1
A2
A3
A4
A5
A6
A7
A8

North American

Letter
Legal
Ledger
Tabloid
Executive
Statement

POS

58mm
80mm
112mm
Custom

Labels

Custom width
Custom height

Custom

width
height
unit
orientation
margins


---

27. Printer profile

Database model:

PrinterProfile

id
businessId
storeId
deviceId

name

type
connectionType

paperWidth
paperHeight
paperUnit

dpi
colorMode

supportsCut
supportsDrawer
supportsBarcode
supportsQr

protocol

ipAddress
port

deviceIdentifier

isDefault


---

28. Printer capabilities

Every printer should expose:

interface PrinterCapabilities {
  color: boolean
  duplex: boolean
  cutPaper: boolean
  cashDrawer: boolean
  barcode: boolean
  qr: boolean
  images: boolean
  text: boolean
  pdf: boolean
  raw: boolean
}

The UI uses these capabilities automatically.


---

29. Thermal printer

For thermal:

Receipt
 ↓
Layout Engine
 ↓
ESC/POS Encoder
 ↓
USB/Bluetooth/TCP
 ↓
Printer

Support:

58mm
80mm
custom

Features:

bold
alignment
font size
double width
double height
underline
QR
barcode
logo
cut
cash drawer
beep


---

30. A4 invoice printing

For A4:

Invoice
 ↓
HTML/CSS document
 ↓
PDF renderer
 ↓
PDF
 ↓
System print

This allows:

Logo
Header
Customer
Items
Tax
Discount
Payment
Bank details
Terms
Signature
QR
Footer

with professional visual design.


---

31. Invoice PDF engine

Create:

packages/pdf

with:

InvoiceRenderer
ReceiptRenderer
CreditReceiptRenderer
PaymentReceiptRenderer
StatementRenderer
BarcodeSheetRenderer
LabelRenderer

Output:

PDF

with:

A4
A5
Letter
Legal
58mm
80mm
Custom


---

32. Beautiful invoice design system

Don't hardcode invoice HTML.

Create:

DocumentTheme

Example:

Modern
Minimal
Classic
Professional
Retail
Elegant
Compact
Tax Invoice

And:

DocumentTemplate

with sections:

Header
Business
Customer
InvoiceMeta
Items
Tax
Totals
Payment
Notes
Terms
Signature
Footer


---

33. Invoice designer

The user should be able to customize:

Logo
Brand color
Font
Font size
Column visibility
Tax display
Discount display
SKU
Barcode
QR
Footer
Terms
Signature
Watermark

This fits directly with the global theme/brand-kit system you were designing previously.


---

34. POS receipt design

Receipt designer:

┌──────────────────────────────┐
│          BUSINESS            │
│      Address / Phone         │
├──────────────────────────────┤
│ Invoice: INV-00124           │
│ Date: 08-Oct-2026            │
├──────────────────────────────┤
│ Product A       2 × 100  200 │
│ Product B       1 × 250  250 │
├──────────────────────────────┤
│ Subtotal              450    │
│ Discount               20    │
│ Tax                    77    │
│ TOTAL                  507    │
├──────────────────────────────┤
│       PAYMENT RECEIVED       │
│             UPI              │
├──────────────────────────────┤
│          [QR CODE]           │
│        Thank you!            │
└──────────────────────────────┘


---

35. Receipt PDF

Even an 80mm receipt should be exportable as:

80mm PDF

rather than forcing everything into A4.

That is important for WhatsApp/email attachments.


---

36. Browser printing

For ordinary printers:

Web
 ↓
Print Preview
 ↓
Browser
 ↓
OS
 ↓
Printer

This works well for:

Inkjet
Laser
Color laser
Dot matrix
Office printer
Network printer
PDF printer

The user can select the OS printer.

However, browser hardware APIs are not universal. Web Serial and WebUSB are secure-context APIs with limited browser availability, and Web Bluetooth is also not baseline across major browsers. 

Therefore:

> Browser system printing is the universal fallback.




---

37. Web POS hardware bridge

For businesses requiring automatic printing:

Browser
   ↓
Local Print Bridge
   ↓
Windows/macOS/Linux
   ↓
Printer

The bridge could expose:

http://127.0.0.1:PORT

or a secure WebSocket:

wss://localhost

Architecture:

Next.js POS
      ↓
WebSocket
      ↓
Local POS Agent
      ↓
Printer Adapter

This gives the web application near-native hardware capabilities.


---

38. Print Bridge

The desktop print bridge should handle:

Printer discovery
Printer status
Print
Cancel
Queue
Retry
Test page
Cash drawer
Barcode
Receipt
Label

It should run:

Windows
macOS
Linux

and preferably be bundled into the desktop application.


---

39. Browser hardware compatibility strategy

Use three levels.

Level 1 — universal

Browser print dialog

Level 2 — modern browser hardware APIs

WebUSB
Web Serial
Web Bluetooth

where supported. 

Level 3 — Print Bridge

Local agent

This is what makes the product commercially reliable.


---

40. Desktop architecture

Use:

Next.js UI
   ↓
Tauri
   ↓
Rust native layer
   ↓
SQLite

Native modules:

Printer
USB
Serial
Bluetooth
Filesystem
Barcode
Cash Drawer
System dialogs

The desktop application should be the best hardware experience.


---

41. Android architecture

Next.js/React
      ↓
Capacitor
      ↓
Android Native
      │
      ├── SQLite
      ├── Camera
      ├── Bluetooth
      ├── USB
      ├── Printer
      ├── Files
      └── Notifications

Android should support:

Camera barcode
Bluetooth scanner
Bluetooth printer
USB printer
Wi-Fi printer
Mobile thermal printer
PDF
Invoice
Receipt


---

42. iOS architecture

Next.js/React
      ↓
Capacitor
      ↓
Swift/native plugins
      │
      ├── SQLite
      ├── Camera
      ├── Bluetooth
      ├── Files
      ├── Printing
      └── Notifications

Hardware capability must be validated per accessory because iOS does not provide the same unrestricted peripheral model as a desktop OS.


---

43. Web/PWA architecture

For online:

Browser
 ↓
Next.js
 ↓
Cloud

For offline:

Browser
 ↓
Service Worker
 ↓
Local database
 ↓
Outbox

The PWA should continue supporting:

POS
Products
Customers
Inventory
Sales
Invoices
Receipts
Credit

while offline.


---

44. Offline PWA database

Use:

IndexedDB

or a SQLite-WASM/local database abstraction depending on your final browser-runtime choice.

The important point is that your repository interface remains:

LocalRepository

so the domain layer doesn't care about the underlying browser persistence technology.


---

45. Offline sync

Use:

Local Transaction
       ↓
SQLite
       ↓
Outbox
       ↓
Connection restored
       ↓
Sync API
       ↓
Cloud
       ↓
Inngest


---

46. Sync record

SyncOutbox

id
businessId
storeId
deviceId

entityType
entityId

operation

payload
baseVersion
clientVersion

createdAt

status
attempts
lastAttemptAt
lastError


---

47. Idempotency

Every transaction receives:

businessId
deviceId
operationId
entityId

Server uniqueness:

businessId
+
deviceId
+
operationId

This prevents:

offline sale
↓
retry
↓
duplicate sale


---

48. Financial conflict model

Do not resolve these with simple last-write-wins:

Sale
Payment
Refund
Credit repayment
Inventory movement
Cash movement
Shift close

These should be immutable events.

For inventory:

Opening
+
Purchases
+
Returns
-
Sales
-
Damage
± Adjustments
=
Stock


---

49. Inngest architecture

Inngest handles cloud jobs.

Events:

sale.completed
invoice.created
receipt.created
payment.created
credit.repayment.created
subscription.renewal.due
subscription.renewed
lead.created
lead.followup.due
attachment.created


---

50. Inngest workflow example

sale.completed
      │
      ├── generate invoice PDF
      │
      ├── generate receipt PDF
      │
      ├── upload attachments
      │
      ├── update search
      │
      ├── update analytics
      │
      └── notification
             │
             ├── WhatsApp
             ├── Email
             └── Telegram


---

51. Notification restrictions

Your stated requirement is sensible:

Notifications should be generated only for:

Invoice
Bill
Receipt
Credit repayment
Subscription renewal

Not every internal event.

For example:

Product updated

should not automatically message customers.


---

52. Notification attachment flow

Invoice created
      ↓
Generate PDF
      ↓
Upload storage
      ↓
Generate signed/download URL
      ↓
WhatsApp
Email
Telegram


---

53. Notification retry

Use:

PENDING
 ↓
PROCESSING
 ↓
SENT

or:

FAILED
 ↓
RETRY
 ↓
FAILED
 ↓
DEAD_LETTER

Inngest handles retry orchestration.


---

54. Online e-commerce

The same catalog powers:

POS
Website
Mobile
Marketplace
AI Agent

Product:

Product
 ├── POS visibility
 ├── Online visibility
 ├── Price
 ├── Inventory
 ├── Images
 ├── SEO
 └── Variants


---

55. Business profile

Every business can have:

/business/[slug]

with:

Logo
Cover
About
Contact
Address
Map
Opening hours
Products
Services
Offers
Reviews
Social links
Gallery


---

56. E-commerce

Store
 ↓
Categories
 ↓
Products
 ↓
Product details
 ↓
Cart
 ↓
Checkout
 ↓
Order
 ↓
Payment
 ↓
Invoice
 ↓
Receipt


---

57. CRM

Online only:

Lead
 ↓
Pipeline
 ↓
Assignment
 ↓
Automation
 ↓
Follow-up
 ↓
Deal


---

58. AI agent

Only online businesses:

Website
   ↓
AI Agent
   ↓
Business Knowledge
   +
Products
   +
Orders
   +
FAQs

Tools:

searchProducts()
getProduct()
checkStock()
getBusinessHours()
getOrder()
createLead()
createSupportRequest()

No direct SQL access.


---

59. Beautiful design system

I would make the UI adaptive rather than making one layout for every device.

Desktop POS

Sidebar
Products
Cart
Payment panel

Tablet

Top toolbar
Categories
Products
Bottom cart/payment

Mobile

Search
Categories
Product list
Floating cart
Payment sheet

Invoice

Professional A4 layout.

Receipt

Compact thermal layout.

Label

Precision label layout.


---

60. Global brand system

Your previously requested theme system should control:

Primary
Secondary
Accent
Background
Text
Success
Warning
Danger
Border

and:

Font family
Heading font
Body font
Invoice font
Receipt font

This should affect:

Dashboard
POS
Invoice
Receipt
PDF
Business profile
E-commerce
Customer portal


---

61. Document design engine

Create:

DocumentTheme

Example:

Modern
Classic
Minimal
Retail
Corporate
Elegant
Compact
Tax

Then:

DocumentTemplate

Templates can be customized independently.


---

62. Print preview

Every document should have:

Preview
Paper Size
Printer
Orientation
Copies
Margins
Scale
Color
Duplex

where supported.

For thermal:

58mm
80mm
Custom

For A4:

Portrait
Landscape


---

63. Print queue

Create:

PrintJob

id
businessId
deviceId
printerId

documentType
documentId

format
paperSize

status
attempts
error

createdAt
startedAt
completedAt

Statuses:

QUEUED
PRINTING
PRINTED
FAILED
CANCELLED


---

64. Printer monitoring

Dashboard:

Printer
 ├── Online
 ├── Offline
 ├── Paper low
 ├── Paper out
 ├── Error
 ├── Cover open
 └── Unknown

Not every printer exposes all status information, so capability detection is required.


---

65. Cash drawer

For supported POS thermal printers:

Payment complete
       ↓
Receipt print
       ↓
Cash drawer pulse

This belongs in:

PrinterCapabilities

as:

supportsCashDrawer


---

66. Customer display

Desktop POS can eventually support:

Customer Display

showing:

Product
Qty
Price
Discount
Tax
Total
Payment
Thank you

Architecture:

POS
 ↓
Local WebSocket
 ↓
Customer Display


---

67. Kitchen/order display

For restaurants or food businesses:

POS
 ↓
Order
 ↓
Kitchen Display
 ↓
Preparing
 ↓
Ready

This can be added without changing the core sales architecture.


---

68. Receipt/invoice QR

Support:

Invoice QR
Payment QR
UPI QR
Order QR
Verification QR
Document QR

The QR content should be configurable.


---

69. PDF security

Generated PDFs should optionally contain:

Document ID
Verification URL
QR
Digital hash
Business ID
Creation timestamp

A verification page:

verify.yourdomain.com/document/...

can validate authenticity.


---

70. Offline PDF

Offline device:

Sale
 ↓
Local document renderer
 ↓
PDF
 ↓
Local storage

When online:

PDF
 ↓
Upload
 ↓
Cloud attachment

This ensures a customer can receive/print a receipt even if the shop has temporarily lost internet.


---

71. Printing architecture summary

The final system is:

PRINT ENGINE
                              │
                 ┌────────────┼────────────┐
                 │            │            │
                 ▼            ▼            ▼
              Browser       Native       Desktop
                 │            │            │
                 ▼            ▼            ▼
            OS Printing    Capacitor     Tauri
                 │            │            │
        ┌────────┼──────┐     │       ┌────┼─────┐
        ▼        ▼      ▼     ▼       ▼    ▼     ▼
      Inkjet   Laser   Dot   Mobile  USB  BLE  Network
                        Matrix
                         │
                      Thermal

This is the architecture I recommend rather than trying to force every printer through one protocol.


---

72. Browser support matrix

Capability	Web	PWA	Android	iOS	Desktop

PDF	✅	✅	✅	✅	✅
System print	✅	✅	OS	OS	✅
Thermal raw	Bridge	Bridge	Native	Native	Native
USB	Limited	Limited	Native	Native limitations	Native
Bluetooth	Limited	Limited	Native	Native	Native
Camera scan	✅	✅	✅	✅	Webcam/mobile
USB barcode	HID	HID	Native	Native	Native
Invoice	✅	✅	✅	✅	✅
Receipt	✅	✅	✅	✅	✅
Offline POS	✅*	✅*	✅	✅	✅
Cloud AI	✅	✅	✅	✅	✅


* subject to the browser's local-storage/runtime architecture.


---

73. Browser printer strategy

For normal businesses:

Click Print
 ↓
Browser dialog
 ↓
Any OS-supported printer

Therefore:

Inkjet: ✅
Laser: ✅
Color printer: ✅
Dot matrix: ✅ where the OS has the appropriate printer/driver
PDF printer: ✅
Office printer: ✅

For automated POS printing:

Print Bridge / Native app

is recommended.


---

74. Why this distinction matters

A user might have:

HP Laser printer
Epson thermal printer
Canon inkjet
Epson dot matrix
Zebra-style label printer
Bluetooth 58mm printer

There is no single universal protocol that all of those understand.

So your application should first determine:

Printer type
Connection
Capabilities
Protocol
Paper

then select the correct renderer.


---

75. Renderer selection

For example:

resolvePrinterJob({
  document: "INVOICE",
  printer: selectedPrinter
})

could resolve:

A4 laser
→ PDF renderer
→ system print

80mm thermal
→ ESC/POS renderer
→ native adapter

50×30 label
→ label renderer
→ label printer adapter


---

76. Release architecture

Release 1 — Foundation

Auth
Business
Employees
Roles
Products
Customers
SQLite
Prisma
Sync


---

Release 2 — POS

Cart
Sales
Payments
Tax
Discount
Invoice
Receipt
Returns
Credit
Shift


---

Release 3 — Hardware

Barcode
Barcode generation
Barcode scanning
Thermal printing
A4 printing
PDF
Print preview
Printer profiles
Print queue


---

Release 4 — Offline

Offline sale
Offline inventory
Offline customers
Offline credit
Offline invoice
Offline receipt
Offline PDF
Sync
Conflict resolution


---

Release 5 — Android/Desktop

Android
Windows
macOS
Linux
Camera
USB
Bluetooth
Native printers


---

Release 6 — iOS

iPhone
iPad
Camera
Barcode
Bluetooth
Printing
Offline
Sync


---

Release 7 — Cloud Business

Dashboard
Business profile
Billing
Inventory
Reports
Subscriptions
Notifications


---

Release 8 — E-commerce

Store
Catalog
Checkout
Orders
Customer portal
SEO


---

Release 9 — CRM

Leads
Pipeline
Contacts
Tasks
Automation


---

Release 10 — AI

AI Business Agent
Customer Chat
Product Agent
Order Agent
Lead Agent


---

77. CI/CD

Use separate pipelines:

GitHub
 │
 ├── Web
 │    └── Production
 │
 ├── Android
 │    └── AAB
 │
 ├── iOS
 │    └── IPA/TestFlight
 │
 └── Desktop
      ├── Windows
      ├── macOS
      └── Linux

Tests:

Lint
TypeScript
Unit
Domain
Integration
Sync
E2E
PDF
Print rendering
Hardware mocks


---

78. Automated print testing

This is particularly important.

For every document:

Invoice
Receipt
Credit receipt
Barcode
Label

generate snapshots for:

A4
A5
Letter
80mm
58mm
50×30mm
Custom

Test:

No overflow
No clipping
No missing barcode
No missing QR
Correct totals
Correct tax
Correct alignment
Correct page breaks


---

79. Printer testing lab

Before commercial release, create a hardware test matrix.

Thermal
 ├── USB
 ├── Bluetooth
 └── Network

Laser
 ├── B/W
 └── Color

Inkjet
 ├── B/W
 └── Color

Dot Matrix
 ├── Continuous paper
 └── A4

Label
 ├── Direct thermal
 └── Other supported protocols

Test each on:

Windows
macOS
Android
iOS
Chrome/Edge supported configurations


---

80. Complete folder architecture

packages/printing/

src/
├── core/
│   ├── PrintEngine.ts
│   ├── PrintJob.ts
│   ├── PrinterProfile.ts
│   └── PrinterCapabilities.ts
│
├── renderers/
│   ├── PdfRenderer.ts
│   ├── EscPosRenderer.ts
│   ├── LabelRenderer.ts
│   ├── BrowserRenderer.ts
│   └── ImageRenderer.ts
│
├── adapters/
│   ├── BrowserPrinter.ts
│   ├── SystemPrinter.ts
│   ├── UsbPrinter.ts
│   ├── BluetoothPrinter.ts
│   ├── NetworkPrinter.ts
│   ├── EscPosPrinter.ts
│   └── LabelPrinter.ts
│
├── documents/
│   ├── Invoice.ts
│   ├── Receipt.ts
│   ├── CreditReceipt.ts
│   ├── PaymentReceipt.ts
│   └── BarcodeLabel.ts
│
├── templates/
│   ├── invoice/
│   ├── receipt/
│   ├── thermal/
│   └── labels/
│
└── index.ts


---

81. Barcode package

packages/barcode/

src/
├── generate/
│   ├── ean13.ts
│   ├── code128.ts
│   ├── qr.ts
│   └── datamatrix.ts
│
├── scan/
│   ├── camera.ts
│   ├── hid.ts
│   ├── bluetooth.ts
│   └── native.ts
│
├── validation/
├── normalization/
├── labels/
└── index.ts


---

82. PDF package

packages/pdf/

src/
├── engine/
├── templates/
├── fonts/
├── invoice/
├── receipt/
├── statement/
├── barcode/
├── labels/
├── themes/
└── index.ts


---

83. Device package

packages/hardware/

src/
├── scanner/
├── printer/
├── cash-drawer/
├── customer-display/
├── camera/
├── usb/
├── bluetooth/
├── serial/
└── capabilities/


---

84. Final UX

The POS operator should never need to understand all of this.

They should see:

POS
 ├── Scan
 ├── Add Product
 ├── Cart
 ├── Customer
 ├── Pay
 ├── Print
 ├── Send
 └── Done

Settings can expose:

Hardware
 ├── Barcode Scanner
 ├── Receipt Printer
 ├── Invoice Printer
 ├── Label Printer
 ├── Cash Drawer
 └── Customer Display

with a simple:

> Detect → Test → Save



workflow.


---

85. Recommended printer setup UI

Printer Settings

Receipt Printer
────────────────────────────
[ Epson Thermal 80mm       ]

Connection
○ USB
○ Bluetooth
○ Network

Paper
○ 58mm
● 80mm
○ Custom

Protocol
● ESC/POS

[ Test Print ]

Invoice Printer
────────────────────────────
[ HP LaserJet ]

Paper
● A4

Color
● Color

[ Test Print ]

Barcode Printer
────────────────────────────
[ Label Printer ]

Label
50 × 30 mm

[ Test Label ]


---

86. Smart printer routing

You can automatically route documents:

Sale receipt
    ↓
Receipt printer

Tax invoice
    ↓
Invoice printer

Barcode
    ↓
Label printer

Credit receipt
    ↓
Receipt printer

A4 statement
    ↓
Office printer

This is a major usability improvement.


---

87. Multi-printer configuration

A store could configure:

Register 01
 ├── Receipt → Thermal 80mm
 ├── Invoice → A4 Laser
 └── Barcode → Label Printer

Register 02
 ├── Receipt → Thermal 58mm
 └── Invoice → A4 Laser

The configuration belongs to:

Business
→ Branch
→ Register
→ Device


---

88. Offline printing rule

Printing should not depend on cloud.

Offline sale
 ↓
Local invoice
 ↓
Local PDF
 ↓
Local printer

Then:

Internet restored
 ↓
Cloud synchronization
 ↓
Cloud attachment
 ↓
Optional notification

This is critical for your offline-business target.


---

89. Online notification rule

After cloud synchronization:

Invoice
 ↓
PDF
 ↓
Notification Policy
 ↓
WhatsApp
Email
Telegram

But the POS operator can still choose:

Print
Download
Send
Skip


---

90. The final architecture I recommend

┌─────────────────────────────┐
                         │       NEXT.JS WEB            │
                         │                              │
                         │ POS / CRM / E-commerce       │
                         │ Business / Billing / AI      │
                         └──────────────┬──────────────┘
                                        │
                         ┌──────────────▼──────────────┐
                         │       DOMAIN SERVICES        │
                         │                              │
                         │ Sales / Inventory / Billing  │
                         │ Credit / Subscription        │
                         │ Customer / Pricing / Tax     │
                         └───────┬───────────┬──────────┘
                                 │           │
                     ┌───────────▼──┐     ┌──▼───────────┐
                     │ LOCAL REPO   │     │ CLOUD REPO   │
                     │ SQLite       │     │ Prisma       │
                     └──────┬───────┘     └──────┬──────┘
                            │                    │
                            │             ┌──────▼───────┐
                            │             │   DATABASE   │
                            │             └──────────────┘
                            │
                      ┌─────▼─────┐
                      │ SYNC      │
                      │ OUTBOX    │
                      └─────┬─────┘
                            │
                       INTERNET
                            │
                      ┌─────▼─────┐
                      │ INNGEST   │
                      └─────┬─────┘
                            │
          ┌─────────────────┼──────────────────┐
          ▼                 ▼                  ▼
       PDF/Files        Notifications       CRM Jobs
          │                 │
          │          ┌──────┼───────┐
          │          ▼      ▼       ▼
          │       WhatsApp Email Telegram
          │
          ▼
      Storage/R2

And the physical-device side:

POS HARDWARE ENGINE
                         │
       ┌─────────────────┼─────────────────┐
       ▼                 ▼                 ▼
    Scanner           Printer           Cash Drawer
       │                 │
 ┌─────┼─────┐     ┌─────┼──────────────┐
 ▼     ▼     ▼     ▼     ▼      ▼       ▼
Camera HID  BLE  Thermal Laser Inkjet Dot-Matrix
                 │
                 ├── ESC/POS
                 ├── PDF/System Print
                 └── Label Protocol

The key result

With this design, you aren't merely reproducing TailPOS. You are building a cross-platform offline-first Business OS where:

- Android/iOS/desktop/web POS all share the same business domain.
- SQLite makes sales, inventory, credit, invoices and receipts available offline.
- Prisma is the cloud source of truth.
- Inngest handles cloud-side asynchronous work.
- PDF generation works independently of the printer.
- Thermal printers use ESC/POS/native adapters.
- Inkjet, laser, color and dot-matrix printers use the OS/PDF print path.
- Barcode scanners work through camera, HID, USB/Bluetooth and native adapters.
- Barcode labels have their own renderer and sizing system.
- 58/80mm POS paper and A4/A5/Letter/Legal/custom sizes are supported.
- Invoices, receipts, credit receipts and statements have separate beautiful templates.
- The same documents can be printed, downloaded, stored, emailed, or sent through WhatsApp/Telegram.
- Web browsers have universal system-print fallback plus an optional local Print Bridge for advanced POS hardware.
- Desktop has native hardware access.
- Mobile has native camera/Bluetooth/USB capabilities through Capacitor.
- Online businesses get e-commerce, CRM, automation and the agentic AI layer.
- Offline businesses get the complete POS/business operation without requiring AI or internet.

For the browser specifically, I would not make WebUSB/WebSerial/WebBluetooth mandatory because those APIs have limited browser availability and permission/security constraints.  The Print Bridge/native application should be the reliability layer for professional POS deployments.

This gives you a much stronger foundation for the Prisma schema + local SQLite schema + Sync Protocol + POS service layer + Inngest workflows + PDF/print engine + barcode engine + Next.js architecture + Capacitor/Tauri implementation + release pipeline that you asked for in points 1–10.



Plan 3

Now web application already has a working camera-based barcode scanner, we should reuse that scanner implementation across web, Android, iOS, and desktop rather than designing a separate scanner from scratch.

The architecture should treat camera scanning as a first-class BarcodeScanner capability:

BarcodeScanner API
                           │
          ┌────────────────┼────────────────┐
          │                │                │
      Web Camera       Mobile Camera     USB/HID Scanner
          │                │                │
   Existing Web      Native Camera      Keyboard/HID
     Scanner           Adapter             Adapter
          │                │                │
          └────────────────┼────────────────┘
                           ▼
                  Barcode Normalizer
                           │
                  Barcode Validator
                           │
                  Product Resolver
                           │
          ┌────────────────┴───────────────┐
          │                                │
       Product                         Unknown
        Found                           Barcode
          │                                │
       Add to POS                   Create Product /
       Cart                           Map Barcode

Important change to the previous plan

Your existing web camera scanner becomes the reference implementation.

We should not create:

- Web scanner
- Android scanner
- iOS scanner

as three unrelated systems.

Instead:

interface BarcodeScanner {
  start(options?: ScannerOptions): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;

  onDetected(
    callback: (result: BarcodeScanResult) => void
  ): () => void;

  getCapabilities(): ScannerCapabilities;
}

Then implement:

packages/barcode/
├── core/
│   ├── BarcodeScanner.ts
│   ├── BarcodeResult.ts
│   ├── BarcodeTypes.ts
│   ├── BarcodeNormalizer.ts
│   └── BarcodeValidator.ts
│
├── scan/
│   ├── ScannerController.ts
│   ├── ScannerSession.ts
│   ├── DetectionDebouncer.ts
│   └── ProductResolver.ts
│
├── web/
│   └── WebCameraScanner.ts       ← reuse your existing implementation
│
├── mobile/
│   ├── MobileCameraScanner.ts
│   └── NativeScannerAdapter.ts
│
├── hardware/
│   ├── HIDScanner.ts
│   ├── BluetoothScanner.ts
│   └── USBScanner.ts
│
├── generate/
│   ├── BarcodeGenerator.ts
│   ├── QRGenerator.ts
│   └── LabelGenerator.ts
│
└── labels/
    ├── LabelTemplate.ts
    └── LabelLayoutEngine.ts

POS scanning flow

When the cashier scans:

Camera
  ↓
Barcode detected
  ↓
Normalize barcode
  ↓
Validate checksum
  ↓
ProductBarcode lookup
  ↓
Product / Variant
  ↓
Check availability
  ↓
Add to cart
  ↓
Increase quantity if already present

For example:

const result = await barcodeService.scan();

const barcode = normalizeBarcode(result.value);

const product = await productResolver.resolve({
  barcode,
  branchId,
  warehouseId,
});

if (product) {
  cart.addProduct(product);
} else {
  showUnknownBarcodeDialog(barcode);
}

Mobile camera

On Android/iOS, the same API can use the native camera when available:

Scanner API
                        │
              ┌─────────┴─────────┐
              │                   │
             Web               Native
              │                   │
       Existing scanner      Camera plugin
                                  │
                         Android / iOS camera

The UI remains the same:

┌──────────────────────────────┐
│ Scan Product             ✕   │
├──────────────────────────────┤
│                              │
│       ┌──────────────┐       │
│       │              │       │
│       │   CAMERA     │       │
│       │              │       │
│       └──────────────┘       │
│                              │
│   Align barcode inside box   │
│                              │
├──────────────────────────────┤
│ 🔦 Flash       🔄 Camera     │
│                              │
│ Enter barcode manually       │
└──────────────────────────────┘

Offline is fully supported

The scanner does not need Internet.

For an offline POS:

Camera
  ↓
Barcode
  ↓
Local SQLite
  ↓
Product lookup
  ↓
Local cart
  ↓
Sale
  ↓
Inventory movement
  ↓
Local invoice/receipt
  ↓
Local print/PDF
  ↓
Sync Outbox
  ↓
Cloud when Internet returns

This is particularly important because your offline POS shouldn't depend on the online AI or cloud API.

Also support scanning beyond products

The scanner service should eventually recognize:

Barcode/QR	Purpose

EAN-8	Retail product
EAN-13	Retail product
UPC-A	Retail product
UPC-E	Retail product
Code 128	Internal/SKU
Code 39	Internal inventory
GS1-128	Supply chain
GS1 DataBar	Retail
QR	Product/payment/document
Data Matrix	Small labels
Custom internal barcode	Business-specific


And the same scanner can be reused for:

Product lookup
POS checkout
Inventory receiving
Stock transfer
Stock count
Purchase receiving
Batch tracking
Serial number tracking
Returns
Exchange
Customer lookup
Invoice lookup
Payment lookup
Delivery/order lookup

One particularly important optimization

For POS, don't query the server every time a barcode is scanned.

Keep a local indexed table:

ProductBarcode
-------------------------
id
productId
variantId
barcode
barcodeType
normalizedValue
isPrimary
isActive

with a local index:

CREATE INDEX idx_product_barcode_normalized
ON ProductBarcode(normalizedValue);

Then a scan becomes essentially:

SELECT *
FROM ProductBarcode
WHERE normalizedValue = ?
LIMIT 1;

This gives you very fast offline scanning, even when the business has tens or hundreds of thousands of products.

So the revised architecture is:

existing web camera scanner → common BarcodeScanner interface → web/native/hardware adapters → local product resolver → POS/inventory workflows.

And yes, camera scanning should be included in the complete implementation rather than treated as a future feature.
