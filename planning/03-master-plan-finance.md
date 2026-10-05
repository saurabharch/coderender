Worked for 8s

Yes. I’ll treat “SQL-Lite” as SQLite and design the database so the same domain model can later migrate cleanly to PostgreSQL/Supabase.

The key design decision is: SQLite is the local/offline database; PostgreSQL/Supabase should remain the eventual central source of truth. The schema below therefore uses UUID-like TEXT IDs, integer money values in paise, immutable ledger records, sync metadata, and minimal SQLite-specific assumptions.

SMB Business OS — Full Engineering PRD + SQLite Database Specification

1. Product definition

Working name

Business OS / Vyapar Platform

Target users

Kirana stores

Retail shops

Garment businesses

Wholesalers

Distributors

Electronics shops

Hardware shops

Restaurants

Service businesses

Small manufacturers

Multi-store businesses


Primary capabilities

Business
├── Customers
├── Suppliers
├── Khata / Ledger
├── Billing
├── GST
├── POS
├── Inventory
├── Purchases
├── Expenses
├── Payments
├── QR
├── Payment Links
├── Collections
├── Reminders
├── Accounting
├── Reports
├── Staff
├── Notifications
├── Documents
├── Audit
├── Offline Sync
├── Subscriptions
├── Finance
└── AI Assistant


---

2. Architecture

MOBILE / WEB
                              │
                              ▼
                       API / Sync Layer
                              │
               ┌──────────────┴──────────────┐
               │                             │
          SQLite Local                 PostgreSQL
          Database                     Central DB
               │                             │
               └──────────────┬──────────────┘
                              │
                     Event / Job Layer
                              │
       ┌──────────┬───────────┼───────────┬──────────┐
       ▼          ▼           ▼           ▼          ▼
   Payments   Notifications Inventory   Reports    Search
       │          │           │           │          │
       ▼          ▼           ▼           ▼          ▼
   Gateways    WhatsApp      Stock       Analytics Typesense
               SMS

Recommended stack

Layer	Technology

Mobile	React Native
Web	React + Vite
UI	Mantine + Radix
API	Fastify + TypeScript
Local DB	SQLite
Central DB	PostgreSQL/Supabase
Cache	Redis
Queue	BullMQ / Inngest
Search	Typesense
Files	Supabase Storage / MinIO
Payments	PayU / Razorpay / Easebuzz adapters
Webhooks	Svix-like webhook layer
Analytics	PostgreSQL materialized/reporting tables
Auth	Supabase Auth or dedicated identity service



---

3. Fundamental database conventions

IDs

Use:

TEXT

containing UUID/UUIDv7.

Example:

0199xxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

UUIDv7 is preferable because it provides chronological ordering.


---

4. Money representation

Never use floating-point numbers for financial values.

Use:

amount_paise INTEGER

Example:

₹1,250.50

stored as:

125050

Currency:

currency_code TEXT DEFAULT 'INR'


---

5. Time representation

Store UTC timestamps:

TEXT

using:

2026-10-05T10:30:00.000Z

Convert to merchant timezone at presentation level.


---

6. SQLite initialization

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;

For financial-critical local writes, you can use:

PRAGMA synchronous = FULL;

depending on device/storage requirements.


---

7. Database domains

I recommend approximately 55 tables.

01 Identity
02 Business
03 Customers/Suppliers
04 Products
05 Inventory
06 Billing
07 Accounting
08 Payments
09 Collections
10 Notifications
11 Documents
12 Sync
13 Audit
14 Subscription
15 Finance
16 Reporting


---

8. IDENTITY DOMAIN

8.1 users

Application users.

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    preferred_language TEXT DEFAULT 'en-IN',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','inactive','blocked')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);


---

8.2 user_devices

Mobile/web devices.

CREATE TABLE user_devices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_type TEXT NOT NULL,
    device_name TEXT,
    device_identifier TEXT,
    push_token TEXT,
    app_version TEXT,
    os_version TEXT,
    last_seen_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (user_id) REFERENCES users(id)
);


---

8.3 roles

CREATE TABLE roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

Default roles:

owner
admin
manager
accountant
cashier
sales_staff
inventory_manager
viewer


---

8.4 permissions

CREATE TABLE permissions (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    module TEXT NOT NULL,
    created_at TEXT NOT NULL
);

Examples:

customer.create
customer.update
invoice.create
invoice.cancel
payment.create
payment.refund
inventory.adjust
report.view
staff.manage
settings.manage


---

8.5 role_permissions

CREATE TABLE role_permissions (
    role_id TEXT NOT NULL,
    permission_id TEXT NOT NULL,

    PRIMARY KEY (role_id, permission_id),

    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (permission_id) REFERENCES permissions(id)
);


---

9. BUSINESS DOMAIN

9.1 businesses

Tenant root.

CREATE TABLE businesses (
    id TEXT PRIMARY KEY,

    legal_name TEXT NOT NULL,
    display_name TEXT NOT NULL,

    business_type TEXT,
    gstin TEXT,
    pan TEXT,

    phone TEXT,
    email TEXT,

    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    state_code TEXT,
    postal_code TEXT,
    country_code TEXT DEFAULT 'IN',

    currency_code TEXT DEFAULT 'INR',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    language_code TEXT DEFAULT 'en-IN',

    financial_year_start_month INTEGER DEFAULT 4,

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','suspended','closed')),

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);


---

9.2 business_users

CREATE TABLE business_users (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'active',

    joined_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    UNIQUE (business_id, user_id),

    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);


---

9.3 business_settings

CREATE TABLE business_settings (
    business_id TEXT PRIMARY KEY,

    invoice_prefix TEXT DEFAULT 'INV',
    invoice_start_number INTEGER DEFAULT 1,

    default_payment_terms_days INTEGER DEFAULT 0,

    enable_inventory INTEGER DEFAULT 1,
    enable_gst INTEGER DEFAULT 1,
    enable_notifications INTEGER DEFAULT 1,

    default_tax_rate_bps INTEGER DEFAULT 0,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (business_id) REFERENCES businesses(id)
);


---

9.4 business_locations

Supports multiple shops/branches.

CREATE TABLE business_locations (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,

    name TEXT NOT NULL,
    code TEXT,

    phone TEXT,

    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,

    is_default INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (business_id) REFERENCES businesses(id)
);


---

10. CUSTOMER DOMAIN

10.1 customers

CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,

    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,

    gstin TEXT,
    pan TEXT,

    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    state_code TEXT,
    postal_code TEXT,

    opening_balance_paise INTEGER DEFAULT 0,

    credit_limit_paise INTEGER DEFAULT 0,
    credit_days INTEGER DEFAULT 0,

    notes TEXT,

    status TEXT DEFAULT 'active',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,

    FOREIGN KEY (business_id) REFERENCES businesses(id)
);


---

10.2 suppliers

CREATE TABLE suppliers (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,

    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,

    gstin TEXT,
    pan TEXT,

    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    state_code TEXT,
    postal_code TEXT,

    opening_balance_paise INTEGER DEFAULT 0,

    credit_days INTEGER DEFAULT 0,

    notes TEXT,

    status TEXT DEFAULT 'active',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,

    FOREIGN KEY (business_id) REFERENCES businesses(id)
);


---

11. PRODUCT DOMAIN

11.1 product_categories

CREATE TABLE product_categories (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,

    parent_id TEXT,

    name TEXT NOT NULL,
    code TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT,

    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (parent_id) REFERENCES product_categories(id)
);


---

11.2 units

CREATE TABLE units (
    id TEXT PRIMARY KEY,
    business_id TEXT,

    code TEXT NOT NULL,
    name TEXT NOT NULL,

    decimal_places INTEGER DEFAULT 0,

    UNIQUE (business_id, code),

    FOREIGN KEY (business_id) REFERENCES businesses(id)
);

Examples:

PCS
KG
GM
LTR
ML
BOX
DOZEN
METER


---

11.3 products

CREATE TABLE products (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,

    category_id TEXT,
    unit_id TEXT,

    sku TEXT,
    barcode TEXT,

    name TEXT NOT NULL,
    description TEXT,

    purchase_price_paise INTEGER DEFAULT 0,
    selling_price_paise INTEGER DEFAULT 0,
    mrp_paise INTEGER DEFAULT 0,

    gst_rate_bps INTEGER DEFAULT 0,
    hsn_code TEXT,

    reorder_level INTEGER DEFAULT 0,
    minimum_stock INTEGER DEFAULT 0,

    track_inventory INTEGER DEFAULT 1,

    status TEXT DEFAULT 'active',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,

    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (category_id) REFERENCES product_categories(id),
    FOREIGN KEY (unit_id) REFERENCES units(id)
);


---

11.4 product_variants

Useful for garments.

CREATE TABLE product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,

    sku TEXT,
    barcode TEXT,

    variant_name TEXT,

    attributes_json TEXT,

    purchase_price_paise INTEGER,
    selling_price_paise INTEGER,
    mrp_paise INTEGER,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (product_id) REFERENCES products(id)
);

Example:

{
  "size": "XL",
  "color": "Blue"
}


---

12. INVENTORY DOMAIN

12.1 warehouses

CREATE TABLE warehouses (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    location_id TEXT,

    name TEXT NOT NULL,
    code TEXT,

    status TEXT DEFAULT 'active',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (location_id) REFERENCES business_locations(id)
);


---

12.2 stock_balances

Current materialized stock.

CREATE TABLE stock_balances (
    id TEXT PRIMARY KEY,

    business_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    variant_id TEXT,

    quantity REAL NOT NULL DEFAULT 0,

    reserved_quantity REAL DEFAULT 0,

    average_cost_paise INTEGER DEFAULT 0,

    updated_at TEXT NOT NULL,

    UNIQUE (
        warehouse_id,
        product_id,
        variant_id
    ),

    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (variant_id) REFERENCES product_variants(id)
);


---

12.3 stock_movements

Immutable inventory ledger.

CREATE TABLE stock_movements (
    id TEXT PRIMARY KEY,

    business_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,

    product_id TEXT NOT NULL,
    variant_id TEXT,

    movement_type TEXT NOT NULL,

    quantity REAL NOT NULL,

    unit_cost_paise INTEGER DEFAULT 0,

    reference_type TEXT,
    reference_id TEXT,

    movement_date TEXT NOT NULL,

    created_by TEXT,
    created_at TEXT NOT NULL,

    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

Movement types:

OPENING
PURCHASE
SALE
SALE_RETURN
PURCHASE_RETURN
TRANSFER_IN
TRANSFER_OUT
DAMAGE
EXPIRY
ADJUSTMENT
STOCK_COUNT


---

13. BILLING DOMAIN

13.1 invoices

CREATE TABLE invoices (
    id TEXT PRIMARY KEY,

    business_id TEXT NOT NULL,
    location_id TEXT,

    customer_id TEXT,

    invoice_number TEXT NOT NULL,

    invoice_type TEXT NOT NULL,

    invoice_date TEXT NOT NULL,
    due_date TEXT,

    place_of_supply TEXT,

    subtotal_paise INTEGER NOT NULL DEFAULT 0,
    discount_paise INTEGER NOT NULL DEFAULT 0,

    taxable_amount_paise INTEGER DEFAULT 0,

    cgst_paise INTEGER DEFAULT 0,
    sgst_paise INTEGER DEFAULT 0,
    igst_paise INTEGER DEFAULT 0,
    cess_paise INTEGER DEFAULT 0,

    round_off_paise INTEGER DEFAULT 0,

    total_paise INTEGER NOT NULL DEFAULT 0,
    paid_paise INTEGER NOT NULL DEFAULT 0,
    due_paise INTEGER NOT NULL DEFAULT 0,

    status TEXT NOT NULL DEFAULT 'draft',

    notes TEXT,

    created_by TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (location_id) REFERENCES business_locations(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),

    UNIQUE (business_id, invoice_number)
);


---

13.2 invoice_items

CREATE TABLE invoice_items (
    id TEXT PRIMARY KEY,

    invoice_id TEXT NOT NULL,

    product_id TEXT,
    variant_id TEXT,

    description TEXT NOT NULL,

    hsn_code TEXT,

    quantity REAL NOT NULL,

    unit_code TEXT,

    unit_price_paise INTEGER NOT NULL,

    discount_paise INTEGER DEFAULT 0,

    taxable_amount_paise INTEGER DEFAULT 0,

    gst_rate_bps INTEGER DEFAULT 0,

    cgst_paise INTEGER DEFAULT 0,
    sgst_paise INTEGER DEFAULT 0,
    igst_paise INTEGER DEFAULT 0,
    cess_paise INTEGER DEFAULT 0,

    total_paise INTEGER NOT NULL,

    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (variant_id) REFERENCES product_variants(id)
);


---

13.3 invoice_sequences

CREATE TABLE invoice_sequences (
    id TEXT PRIMARY KEY,

    business_id TEXT NOT NULL,
    financial_year TEXT NOT NULL,

    prefix TEXT NOT NULL,
    next_number INTEGER NOT NULL DEFAULT 1,

    UNIQUE (business_id, financial_year)
);


---

14. TAX DOMAIN

14.1 tax_rates

CREATE TABLE tax_rates (
    id TEXT PRIMARY KEY,

    business_id TEXT,

    name TEXT NOT NULL,

    gst_rate_bps INTEGER NOT NULL,

    cgst_rate_bps INTEGER DEFAULT 0,
    sgst_rate_bps INTEGER DEFAULT 0,
    igst_rate_bps INTEGER DEFAULT 0,
    cess_rate_bps INTEGER DEFAULT 0,

    effective_from TEXT,
    effective_to TEXT,

    status TEXT DEFAULT 'active',

    FOREIGN KEY (business_id) REFERENCES businesses(id)
);


---

15. ACCOUNTING DOMAIN

This is the most important part of the financial architecture.

15.1 ledger_accounts

CREATE TABLE ledger_accounts (
    id TEXT PRIMARY KEY,

    business_id TEXT NOT NULL,

    parent_id TEXT,

    account_code TEXT NOT NULL,
    account_name TEXT NOT NULL,

    account_type TEXT NOT NULL,

    normal_balance TEXT NOT NULL,

    is_system INTEGER DEFAULT 0,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    UNIQUE (business_id, account_code),

    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (parent_id) REFERENCES ledger_accounts(id)
);

Account types:

ASSET
LIABILITY
EQUITY
INCOME
EXPENSE


---

15.2 ledger_transactions

CREATE TABLE ledger_transactions (
    id TEXT PRIMARY KEY,

    business_id TEXT NOT NULL,

    transaction_type TEXT NOT NULL,

    reference_type TEXT,
    reference_id TEXT,

    transaction_date TEXT NOT NULL,

    description TEXT,

    status TEXT NOT NULL DEFAULT 'posted',

    idempotency_key TEXT,

    created_by TEXT,
    created_at TEXT NOT NULL,

    UNIQUE (business_id, idempotency_key),

    FOREIGN KEY (business_id) REFERENCES businesses(id)
);


---

15.3 ledger_entries

CREATE TABLE ledger_entries (
    id TEXT PRIMARY KEY,

    transaction_id TEXT NOT NULL,
    account_id TEXT NOT NULL,

    debit_paise INTEGER NOT NULL DEFAULT 0,
    credit_paise INTEGER NOT NULL DEFAULT 0,

    description TEXT,

    created_at TEXT NOT NULL,

    CHECK (
        debit_paise >= 0
        AND credit_paise >= 0
        AND NOT (
            debit_paise > 0
            AND credit_paise > 0
        )
    ),

    FOREIGN KEY (transaction_id)
        REFERENCES ledger_transactions(id),

    FOREIGN KEY (account_id)
        REFERENCES ledger_accounts(id)
);


---

16. Ledger invariant

Every posted transaction must satisfy:

SUM(debit) = SUM(credit)

Example ₹10,000 credit sale:

Accounts Receivable   DR 10,000
Sales Revenue         CR 10,000

Payment:

UPI/Bank              DR 6,000
Accounts Receivable   CR 6,000

This is what makes the platform accounting-grade.


---

17. PAYMENT DOMAIN

17.1 payment_methods

CREATE TABLE payment_methods (
    id TEXT PRIMARY KEY,

    business_id TEXT NOT NULL,

    name TEXT NOT NULL,

    method_type TEXT NOT NULL,

    provider TEXT,

    is_default INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',

    created_at TEXT NOT NULL,

    FOREIGN KEY (business_id) REFERENCES businesses(id)
);

Types:

CASH
UPI
CARD
BANK_TRANSFER
WALLET
CHEQUE
CREDIT
OTHER


---

17.2 payment_intents

CREATE TABLE payment_intents (
    id TEXT PRIMARY KEY,

    business_id TEXT NOT NULL,

    customer_id TEXT,
    invoice_id TEXT,

    amount_paise INTEGER NOT NULL,

    currency_code TEXT DEFAULT 'INR',

    provider TEXT,
    provider_payment_id TEXT,

    payment_method TEXT,

    status TEXT NOT NULL DEFAULT 'created',

    idempotency_key TEXT,

    expires_at TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),

    UNIQUE (business_id, idempotency_key)
);


---

17.3 payments

CREATE TABLE payments (
    id TEXT PRIMARY KEY,

    business_id TEXT NOT NULL,

    customer_id TEXT,
    supplier_id TEXT,
    invoice_id TEXT,

    payment_intent_id TEXT,

    amount_paise INTEGER NOT NULL,

    currency_code TEXT DEFAULT 'INR',

    payment_type TEXT NOT NULL,

    method TEXT NOT NULL,

    provider TEXT,
    provider_transaction_id TEXT,

    reference_number TEXT,

    status TEXT NOT NULL DEFAULT 'pending',

    payment_date TEXT NOT NULL,

    notes TEXT,

    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (payment_intent_id) REFERENCES payment_intents(id)
);


---

18. PAYMENT PROVIDERS

18.1 payment_providers

CREATE TABLE payment_providers (
    id TEXT PRIMARY KEY,

    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,

    status TEXT DEFAULT 'active',

    created_at TEXT NOT NULL
);

Examples:

razorpay
payu
easebuzz


---

18.2 provider_transactions

CREATE TABLE provider_transactions (
    id TEXT PRIMARY KEY,

    business_id TEXT NOT NULL,

    provider_id TEXT NOT NULL,

    payment_id TEXT,

    provider_transaction_id TEXT NOT NULL,

    provider_order_id TEXT,

    amount_paise INTEGER NOT NULL,

    status TEXT NOT NULL,

    raw_response_json TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (provider_id) REFERENCES payment_providers(id),
    FOREIGN KEY (payment_id) REFERENCES payments(id)
);


---

19. QR DOMAIN

19.1 payment_qr_codes

CREATE TABLE payment_qr_codes (
    id TEXT PRIMARY KEY,

    business_id TEXT NOT NULL,
    location_id TEXT,

    qr_type TEXT NOT NULL,

    upi_id TEXT,

    merchant_name TEXT,

    static_payload TEXT,

    status TEXT DEFAULT 'active',

    created_at TEXT NOT NULL,

    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (location_id) REFERENCES business_locations(id)
);

Types:

STATIC
DYNAMIC


---

20. COLLECTIONS

20.1 collection_requests

CREATE TABLE collection_requests (
    id TEXT PRIMARY KEY,

    business_id TEXT NOT NULL,
    customer_id TEXT,
    invoice_id TEXT,

    amount_paise INTEGER NOT NULL,

    payment_link TEXT,

    status TEXT DEFAULT 'pending',

    due_date TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);


---

21. REMINDERS

21.1 reminders

CREATE TABLE reminders (
    id TEXT PRIMARY KEY,

    business_id TEXT NOT NULL,
    customer_id TEXT,
    invoice_id TEXT,

    reminder_type TEXT NOT NULL,

    channel TEXT NOT NULL,

    scheduled_at TEXT,

    sent_at TEXT,

    status TEXT DEFAULT 'pending',

    message TEXT,

    created_at TEXT NOT NULL,

    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

Channels:

WHATSAPP
SMS
EMAIL
PUSH


---

22. NOTIFICATIONS

22.1 notifications

CREATE TABLE notifications (
    id TEXT PRIMARY KEY,

    business_id TEXT,
    user_id TEXT,

    type TEXT NOT NULL,

    title TEXT NOT NULL,
    body TEXT NOT NULL,

    channel TEXT NOT NULL,

    reference_type TEXT,
    reference_id TEXT,

    status TEXT DEFAULT 'pending',

    sent_at TEXT,
    delivered_at TEXT,
    read_at TEXT,

    created_at TEXT NOT NULL,

    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);


---

23. PURCHASE DOMAIN

23.1 purchase_orders

CREATE TABLE purchase_orders (
    id TEXT PRIMARY KEY,

    business_id TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    warehouse_id TEXT,

    order_number TEXT NOT NULL,

    order_date TEXT NOT NULL,

    subtotal_paise INTEGER DEFAULT 0,
    tax_paise INTEGER DEFAULT 0,
    total_paise INTEGER DEFAULT 0,

    status TEXT DEFAULT 'draft',

    notes TEXT,

    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);


---

23.2 purchase_order_items

CREATE TABLE purchase_order_items (
    id TEXT PRIMARY KEY,

    purchase_order_id TEXT NOT NULL,

    product_id TEXT NOT NULL,
    variant_id TEXT,

    quantity REAL NOT NULL,

    unit_price_paise INTEGER NOT NULL,

    tax_paise INTEGER DEFAULT 0,

    total_paise INTEGER NOT NULL,

    FOREIGN KEY (purchase_order_id)
        REFERENCES purchase_orders(id),

    FOREIGN KEY (product_id)
        REFERENCES products(id)
);


---

24. EXPENSE DOMAIN

24.1 expense_categories

CREATE TABLE expense_categories (
    id TEXT PRIMARY KEY,

    business_id TEXT NOT NULL,

    name TEXT NOT NULL,

    ledger_account_id TEXT,

    created_at TEXT NOT NULL,

    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (ledger_account_id) REFERENCES ledger_accounts(id)
);


---

24.2 expenses

CREATE TABLE expenses (
    id TEXT PRIMARY KEY,

    business_id TEXT NOT NULL,
    category_id TEXT,

    amount_paise INTEGER NOT NULL,

    tax_paise INTEGER DEFAULT 0,

    payment_method TEXT,

    vendor_name TEXT,

    expense_date TEXT NOT NULL,

    description TEXT,

    attachment_url TEXT,

    status TEXT DEFAULT 'posted',

    created_by TEXT,
    created_at TEXT NOT NULL,

    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (category_id) REFERENCES expense_categories(id)
);


---

25. DOCUMENT DOMAIN

25.1 documents

CREATE TABLE documents (
    id TEXT PRIMARY KEY,

    business_id TEXT NOT NULL,

    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,

    document_type TEXT NOT NULL,

    file_name TEXT NOT NULL,
    mime_type TEXT,

    storage_key TEXT NOT NULL,

    file_size INTEGER,

    checksum TEXT,

    created_by TEXT,
    created_at TEXT NOT NULL,

    FOREIGN KEY (business_id) REFERENCES businesses(id)
);

Examples:

invoice_pdf
receipt
gst_certificate
pan_card
kyc_document
purchase_invoice
expense_receipt


---

26. AUDIT DOMAIN

26.1 audit_logs

CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,

    business_id TEXT,
    user_id TEXT,

    action TEXT NOT NULL,

    entity_type TEXT NOT NULL,
    entity_id TEXT,

    before_json TEXT,
    after_json TEXT,

    ip_address TEXT,
    device_id TEXT,

    request_id TEXT,

    created_at TEXT NOT NULL,

    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

Financial records should never be physically deleted simply because a user clicks Delete.

Use:

VOID
REVERSE
ADJUST
CREDIT_NOTE
DEBIT_NOTE


---

27. OFFLINE SYNC DOMAIN

This is particularly important for the SQLite implementation.

27.1 sync_outbox

Every local mutation enters this queue.

CREATE TABLE sync_outbox (
    id TEXT PRIMARY KEY,

    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,

    operation TEXT NOT NULL,

    payload_json TEXT NOT NULL,

    idempotency_key TEXT NOT NULL UNIQUE,

    status TEXT DEFAULT 'pending',

    retry_count INTEGER DEFAULT 0,

    last_error TEXT,

    created_at TEXT NOT NULL,
    synced_at TEXT
);


---

27.2 sync_state

CREATE TABLE sync_state (
    id TEXT PRIMARY KEY,

    entity_type TEXT NOT NULL,

    last_server_cursor TEXT,

    last_synced_at TEXT,

    updated_at TEXT NOT NULL,

    UNIQUE (entity_type)
);


---

27.3 conflict_records

CREATE TABLE conflict_records (
    id TEXT PRIMARY KEY,

    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,

    local_version INTEGER,
    server_version INTEGER,

    local_payload_json TEXT,
    server_payload_json TEXT,

    resolution TEXT,

    created_at TEXT NOT NULL,
    resolved_at TEXT
);


---

28. VERSIONING

Every mutable business entity should eventually contain:

version INTEGER

Example:

customer.version = 7

Local update:

version 7 → 8

Server checks:

expected_version = 7

If server is already version 8:

CONFLICT

This prevents silent overwrites.


---

29. SUBSCRIPTION DOMAIN

29.1 subscription_plans

CREATE TABLE subscription_plans (
    id TEXT PRIMARY KEY,

    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,

    monthly_price_paise INTEGER DEFAULT 0,
    yearly_price_paise INTEGER DEFAULT 0,

    currency_code TEXT DEFAULT 'INR',

    features_json TEXT,

    status TEXT DEFAULT 'active',

    created_at TEXT NOT NULL
);


---

29.2 business_subscriptions

CREATE TABLE business_subscriptions (
    id TEXT PRIMARY KEY,

    business_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,

    status TEXT DEFAULT 'active',

    start_date TEXT NOT NULL,
    end_date TEXT,

    provider TEXT,
    provider_subscription_id TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);


---

30. LOAN / FINANCE DOMAIN

Keep this isolated because financial-services compliance and lifecycle are different from ordinary bookkeeping.

30.1 finance_applications

CREATE TABLE finance_applications (
    id TEXT PRIMARY KEY,

    business_id TEXT NOT NULL,

    provider TEXT,

    product_type TEXT,

    requested_amount_paise INTEGER,

    status TEXT DEFAULT 'draft',

    application_reference TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (business_id) REFERENCES businesses(id)
);


---

30.2 loans

CREATE TABLE loans (
    id TEXT PRIMARY KEY,

    business_id TEXT NOT NULL,

    provider TEXT,

    external_loan_id TEXT,

    principal_paise INTEGER NOT NULL,

    outstanding_paise INTEGER NOT NULL,

    interest_rate_bps INTEGER,

    tenure_months INTEGER,

    status TEXT DEFAULT 'active',

    start_date TEXT,
    maturity_date TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (business_id) REFERENCES businesses(id)
);


---

30.3 loan_repayments

CREATE TABLE loan_repayments (
    id TEXT PRIMARY KEY,

    loan_id TEXT NOT NULL,

    due_date TEXT NOT NULL,

    principal_paise INTEGER DEFAULT 0,
    interest_paise INTEGER DEFAULT 0,
    fee_paise INTEGER DEFAULT 0,

    total_paise INTEGER NOT NULL,

    paid_paise INTEGER DEFAULT 0,

    status TEXT DEFAULT 'pending',

    paid_at TEXT,

    created_at TEXT NOT NULL,

    FOREIGN KEY (loan_id) REFERENCES loans(id)
);


---

31. REPORTING TABLES

Do not calculate every dashboard metric from millions of raw ledger rows.

Create summary tables.

31.1 daily_business_summary

CREATE TABLE daily_business_summary (
    id TEXT PRIMARY KEY,

    business_id TEXT NOT NULL,
    summary_date TEXT NOT NULL,

    sales_paise INTEGER DEFAULT 0,
    collections_paise INTEGER DEFAULT 0,
    purchases_paise INTEGER DEFAULT 0,
    expenses_paise INTEGER DEFAULT 0,

    profit_paise INTEGER DEFAULT 0,

    receivable_paise INTEGER DEFAULT 0,
    payable_paise INTEGER DEFAULT 0,

    transaction_count INTEGER DEFAULT 0,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    UNIQUE (business_id, summary_date),

    FOREIGN KEY (business_id) REFERENCES businesses(id)
);


---

32. Search indexing

Typesense should not become the source of truth.

PostgreSQL/SQLite:

SOURCE

Typesense:

SEARCH INDEX

Collections:

businesses
customers
suppliers
products
invoices
transactions


---

33. Essential indexes

SQLite:

CREATE INDEX idx_customers_business
ON customers(business_id);

CREATE INDEX idx_customers_phone
ON customers(phone);

CREATE INDEX idx_suppliers_business
ON suppliers(business_id);

CREATE INDEX idx_products_business
ON products(business_id);

CREATE INDEX idx_products_barcode
ON products(barcode);

CREATE INDEX idx_invoices_business_date
ON invoices(business_id, invoice_date);

CREATE INDEX idx_invoices_customer
ON invoices(customer_id);

CREATE INDEX idx_invoices_status
ON invoices(business_id, status);

CREATE INDEX idx_invoice_items_invoice
ON invoice_items(invoice_id);

CREATE INDEX idx_payments_business_date
ON payments(business_id, payment_date);

CREATE INDEX idx_payments_customer
ON payments(customer_id);

CREATE INDEX idx_ledger_transactions_business_date
ON ledger_transactions(business_id, transaction_date);

CREATE INDEX idx_ledger_entries_transaction
ON ledger_entries(transaction_id);

CREATE INDEX idx_ledger_entries_account
ON ledger_entries(account_id);

CREATE INDEX idx_stock_movements_product
ON stock_movements(product_id, movement_date);

CREATE INDEX idx_stock_balances_product
ON stock_balances(product_id);

CREATE INDEX idx_notifications_user
ON notifications(user_id, status);

CREATE INDEX idx_reminders_customer
ON reminders(customer_id);

CREATE INDEX idx_audit_business
ON audit_logs(business_id, created_at);

CREATE INDEX idx_sync_outbox_status
ON sync_outbox(status, created_at);


---

34. Critical business relationships

The core relationship graph is:

USER
 │
 └── BUSINESS_USER
          │
          ▼
       BUSINESS
          │
 ┌────────┼─────────┬────────────┐
 ▼        ▼         ▼            ▼
CUSTOMER SUPPLIER PRODUCT     LOCATION
 │                  │            │
 │                  ▼            ▼
 │              INVENTORY     WAREHOUSE
 │
 ▼
INVOICE
 │
 ├── INVOICE_ITEMS
 │
 └── PAYMENT
       │
       ▼
   LEDGER_TRANSACTION
       │
       ▼
   LEDGER_ENTRIES


---

35. Invoice → Inventory → Accounting flow

When a credit sale occurs:

POST SALE
   │
   ├── Create Invoice
   │
   ├── Create Invoice Items
   │
   ├── Stock Movement: SALE
   │
   ├── Reduce Stock Balance
   │
   ├── Ledger:
   │      DR Receivable
   │      CR Sales
   │
   └── Update Customer Balance

When payment occurs:

PAYMENT
   │
   ├── Payment record
   │
   ├── Ledger:
   │      DR Cash/UPI/Bank
   │      CR Receivable
   │
   ├── Invoice.paid
   │
   ├── Invoice.due
   │
   └── Customer outstanding


---

36. Purchase flow

PURCHASE ORDER
       ↓
GOODS RECEIVED
       ↓
STOCK +
       ↓
PURCHASE INVOICE
       ↓
SUPPLIER PAYABLE
       ↓
PAYMENT
       ↓
SUPPLIER BALANCE ↓

Accounting:

Inventory              DR
Input GST              DR
    Accounts Payable       CR


---

37. Expense flow

Expense
   ↓
Expense account
   ↓
Payment method
   ↓
Ledger

Example:

Rent Expense       DR ₹20,000
Cash/Bank          CR ₹20,000


---

38. Payment state machine

CREATED
   │
   ▼
INITIATED
   │
   ├──── FAILED
   │
   ├──── EXPIRED
   │
   ▼
PENDING
   │
   ▼
SUCCESS
   │
   ├──── REFUND_REQUESTED
   │              │
   │              ▼
   │           REFUNDED
   │
   └──── PARTIAL_REFUND


---

39. Invoice state machine

DRAFT
  │
  ▼
ISSUED
  │
  ├── PARTIALLY_PAID
  │       │
  │       ▼
  │     PAID
  │
  └── OVERDUE

Cancellation:

ISSUED
  ↓
CANCELLED

But accounting entries should be reversed rather than deleted.


---

40. Inventory state model

Current stock:

stock_balance

Historical truth:

stock_movements

Never reconstruct historical inventory solely from the current balance.


---

41. Customer outstanding calculation

Conceptually:

Outstanding =
Opening Balance
+ Credit Sales
- Payments
- Credit Notes
- Adjustments

Do not maintain an independently editable:

customer.outstanding

as the source of truth.

It can be a cached/materialized value.


---

42. Offline transaction strategy

For mobile:

User Action
    ↓
SQLite transaction
    ↓
Local UI updates immediately
    ↓
sync_outbox
    ↓
Network available
    ↓
API
    ↓
Server transaction
    ↓
ACK
    ↓
Remove/mark outbox item

This gives the user instant response even with poor connectivity.


---

43. Idempotency

Every financial mutation needs an idempotency key.

Example:

payment:
business_id + device_id + local_transaction_id

Server:

UNIQUE (
    business_id,
    idempotency_key
)

If the mobile app retries:

same request
      ↓
same result

rather than duplicate payment/ledger entries.


---

44. SQLite transaction boundaries

A sale should be one database transaction:

BEGIN;

INSERT INTO invoices ...;

INSERT INTO invoice_items ...;

INSERT INTO stock_movements ...;

UPDATE stock_balances ...;

INSERT INTO ledger_transactions ...;

INSERT INTO ledger_entries ...;

INSERT INTO sync_outbox ...;

COMMIT;

If any step fails:

ROLLBACK;

Never allow:

invoice created
+
stock updated
-
ledger missing


---

45. Business-level transaction boundary

For example:

Record ₹5,000 payment

One transaction must update:

payments
ledger_transactions
ledger_entries
invoice
customer state
sync_outbox
audit_logs


---

46. RBAC matrix

Feature	Owner	Manager	Accountant	Cashier	Inventory

Customers	✓	✓	✓	✓	View
Khata	✓	✓	✓	✓	View
Invoice	✓	✓	✓	✓	View
Payment	✓	✓	✓	✓	—
Refund	✓	✓	✓	—	—
Inventory	✓	✓	View	View	✓
Purchase	✓	✓	✓	—	✓
Expenses	✓	✓	✓	—	—
Accounting	✓	View	✓	—	—
Reports	✓	✓	✓	Limited	Limited
Staff	✓	✓	—	—	—
Settings	✓	Limited	—	—	—



---

47. API module structure

/api/v1

/auth
/businesses
/users
/roles
/permissions

/customers
/suppliers

/products
/categories
/units
/inventory
/warehouses

/invoices
/tax
/expenses
/purchases

/payments
/payment-intents
/payment-links
/qr

/ledger
/accounting

/reminders
/notifications

/reports
/documents

/subscriptions
/finance

/sync
/webhooks
/audit


---

48. Important API endpoints

Customers

GET    /customers
POST   /customers
GET    /customers/:id
PATCH  /customers/:id
DELETE /customers/:id
GET    /customers/:id/ledger
GET    /customers/:id/transactions

Invoices

POST   /invoices
GET    /invoices
GET    /invoices/:id
POST   /invoices/:id/send
POST   /invoices/:id/cancel
POST   /invoices/:id/payment-link
GET    /invoices/:id/pdf

Payments

POST /payments
GET  /payments
GET  /payments/:id
POST /payments/:id/refund

Inventory

GET  /products
POST /products
PATCH /products/:id

GET  /inventory
POST /inventory/adjust
GET  /inventory/movements


---

49. Event model

Use domain events:

business.created

customer.created
customer.updated

invoice.created
invoice.issued
invoice.paid
invoice.overdue
invoice.cancelled

payment.created
payment.pending
payment.success
payment.failed
payment.refunded

stock.updated
stock.low

purchase.created
purchase.received

expense.created

reminder.created
reminder.sent

loan.created
loan.repayment_due

Event:

{
  "id": "event-id",
  "type": "payment.success",
  "version": 1,
  "business_id": "business-id",
  "aggregate_type": "payment",
  "aggregate_id": "payment-id",
  "occurred_at": "2026-10-05T10:30:00Z",
  "payload": {}
}


---

50. Queue architecture

EVENT BUS
                        │
        ┌───────────────┼────────────────┐
        ▼               ▼                ▼
 payment.queue    notification.queue   report.queue
        │               │                │
        ▼               ▼                ▼
 payment-worker   notification-worker report-worker

Additional queues:

invoice.queue
inventory.queue
search.queue
export.queue
reconciliation.queue
reminder.queue


---

51. Outbox pattern

For important events:

DB Transaction
     │
     ├── Business change
     │
     └── Outbox event
             │
             ▼
       Event Publisher
             │
             ▼
          Queue

This avoids:

database updated
but event lost


---

52. Security requirements

Authentication

OTP

access token

refresh token

device registration

session revocation


Authorization

RBAC

business isolation

permission checks

financial operation authorization


Data protection

TLS

encrypted secrets

encrypted sensitive fields where appropriate

secure object storage

signed URLs


API security

rate limits

request validation

idempotency

webhook signatures

replay protection

request IDs



---

53. Financial invariants

These should be enforced in application/domain services.

Ledger

debit_total = credit_total

Invoice

paid <= total

Inventory

reserved <= available + reserved

Payment

successful payment cannot become pending

Refund

total_refunded <= total_paid

Loan

paid_principal <= principal


---

54. Database integrity rules

SQLite CHECK constraints should handle basic invariants.

For example:

CHECK (amount_paise >= 0)

and:

CHECK (quantity > 0)

Application/domain services handle cross-row invariants such as balanced journal entries.


---

55. Soft deletion

Do not delete:

customers
invoices
payments
ledger_transactions
ledger_entries
stock_movements
audit_logs

Use:

deleted_at

for user-facing master data.

Financial records should instead be:

cancelled
voided
reversed


---

56. Database migration strategy

The SQLite schema should deliberately avoid PostgreSQL-only types.

Use:

TEXT
INTEGER
REAL

rather than relying on:

UUID
JSONB
NUMERIC
TIMESTAMPTZ
ENUM
ARRAY

Then PostgreSQL mapping becomes:

SQLite	PostgreSQL

TEXT UUID	UUID
INTEGER paise	BIGINT
REAL quantity	NUMERIC
TEXT timestamp	TIMESTAMPTZ
TEXT JSON	JSONB
CHECK status	ENUM/domain/check
INTEGER boolean	BOOLEAN



---

57. Recommended central PostgreSQL evolution

Once the platform becomes multi-business and high-volume:

SQLite
     │
     │ sync
     ▼
PostgreSQL
     │
     ├── Redis
     ├── Typesense
     ├── Object Storage
     └── Workers

SQLite remains:

offline/local operational database

while PostgreSQL becomes:

authoritative server database


---

58. Suggested SQLite database file structure

For mobile:

business.db

Potentially:

business.db
business.db-wal
business.db-shm

Do not put the database in publicly accessible storage.


---

59. Recommended local SQLite indexes

For mobile performance, prioritize:

business_id
customer_id
supplier_id
invoice_number
invoice_date
payment_date
product_id
barcode
sku
stock product/warehouse
ledger transaction/date
sync status

Don't blindly index every column because SQLite writes become more expensive.


---

60. Database modules in code

I recommend this structure:

src/
├── modules/
│
├── auth/
├── business/
├── customers/
├── suppliers/
├── products/
├── inventory/
├── billing/
├── tax/
├── payments/
├── accounting/
├── expenses/
├── purchases/
├── reminders/
├── notifications/
├── reports/
├── documents/
├── subscriptions/
├── finance/
├── sync/
└── audit/

Each module:

module/
├── domain/
├── application/
├── infrastructure/
├── repository/
├── schemas/
├── service/
└── routes/

This lets you start as a modular monolith and extract services later.


---

61. SQLite repository abstraction

Do not let UI code directly execute SQL.

Use:

UI
 ↓
Application Service
 ↓
Repository
 ↓
SQLite

Example:

recordPayment()
       ↓
PaymentService
       ↓
PaymentRepository
LedgerRepository
InvoiceRepository
SyncRepository
AuditRepository


---

62. Critical service: RecordPayment

Conceptually:

recordPayment(input) {
    validatePayment(input);

    beginTransaction();

    const payment = createPayment(input);

    createLedgerTransaction(payment);

    createLedgerEntries(payment);

    updateInvoicePaymentState(payment);

    updateCustomerBalance(payment);

    createOutboxEvent(payment);

    createAuditLog(payment);

    commit();

    return payment;
}

This should be treated as a domain transaction, not five independent API operations.


---

63. Critical service: CreateInvoice

CreateInvoice
     │
     ├── Validate customer
     ├── Validate products
     ├── Calculate tax
     ├── Calculate totals
     ├── Generate invoice number
     ├── Insert invoice
     ├── Insert items
     ├── Update stock
     ├── Create accounting entry
     ├── Create customer receivable
     ├── Create outbox event
     └── Audit


---

64. GST calculation architecture

Do:

Invoice
  ↓
TaxContext
  ↓
TaxRuleResolver
  ↓
TaxCalculator
  ↓
TaxBreakdown

Do not do:

React component
 ↓
CGST = amount * 0.09

The backend/domain layer must own taxation.


---

65. Dashboard architecture

Don't run 20 heavy queries every time the home page loads.

Use:

Transaction
   ↓
Event
   ↓
Summary Worker
   ↓
daily_business_summary
   ↓
Dashboard

Then the dashboard can load quickly.


---

66. Search architecture

For example:

Customer created
       ↓
customer.created
       ↓
Search worker
       ↓
Typesense

Search:

"rah"

returns:

Rahul Sharma
Rahul Traders
Rahul Garments

But the authoritative record remains PostgreSQL/SQLite.


---

67. Multilingual schema

Don't store only translated UI strings.

Create translation resources separately.

Conceptually:

translation_keys
translation_values

Example:

payment_received

en-IN → Payment received
hi-IN → भुगतान प्राप्त हुआ
mr-IN → पेमेंट प्राप्त झाले

Business-entered content should remain user-created data and shouldn't automatically be treated as UI translation.


---

68. Feature flags

Add:

feature_flags
business_feature_flags

to allow gradual rollout:

inventory_v2
ai_assistant
voice_commands
loan_offers
dynamic_qr
advanced_accounting


---

69. Future AI database layer

Don't put AI-generated facts directly into financial tables.

Use:

ai_conversations
ai_messages
ai_actions
ai_insights

AI action:

"Send reminder to Rahul"

should become:

AI proposal
      ↓
permission check
      ↓
user confirmation
      ↓
actual reminder service

not direct database mutation.


---

70. Core MVP database

If you want to build the first release quickly, don't implement all 55 tables initially.

Start with these 24 tables:

users
user_devices
roles
permissions
role_permissions

businesses
business_users
business_settings
business_locations

customers
suppliers

product_categories
units
products
warehouses
stock_balances
stock_movements

invoices
invoice_items

ledger_accounts
ledger_transactions
ledger_entries

payments
reminders

Then add:

payment_intents
provider_transactions
payment_qr_codes
purchase_orders
purchase_order_items
expenses
documents
notifications
audit_logs
sync_outbox
sync_state
subscription_plans
business_subscriptions
finance_applications
loans
loan_repayments
daily_business_summary


---

71. Recommended implementation sequence

Sprint 1 — Foundation

SQLite
Migration engine
UUID
Users
Businesses
RBAC
Business settings

Sprint 2 — Khata

Customers
Suppliers
Ledger
Opening balances
Credit
Debit
Statements

Sprint 3 — Billing

Products
Invoices
Invoice items
GST
PDF

Sprint 4 — Payments

Payment
Payment intent
UPI
QR
Payment links
Webhook

Sprint 5 — Inventory

Warehouse
Stock balance
Stock movement
Low stock
Barcode

Sprint 6 — Collections

Reminders
WhatsApp
SMS
Notifications

Sprint 7 — Accounting

Chart of accounts
Expenses
P&L
Trial balance
Balance sheet
Cash flow

Sprint 8 — POS/Purchases

POS
Purchase orders
GRN
Purchase invoices
Returns

Sprint 9 — Offline sync

Outbox
Cursor sync
Conflict detection
Retry
Idempotency

Sprint 10 — Production platform

PostgreSQL
Redis
Typesense
Workers
Observability
Admin

Sprint 11+

Loans
AI
Voice
Forecasting
Credit intelligence
Multi-location
Advanced commerce


---

72. Final production architecture

The architecture I would ultimately target is:

┌───────────────────┐
                         │ React / Mobile    │
                         │ Web / PWA         │
                         └─────────┬─────────┘
                                   │
                            API / Sync Layer
                                   │
                         ┌─────────▼─────────┐
                         │ Fastify / TS      │
                         │ Modular Platform   │
                         └─────────┬─────────┘
                                   │
       ┌───────────────────────────┼─────────────────────────┐
       │                           │                         │
       ▼                           ▼                         ▼
 PostgreSQL                     Redis                   Object Storage
 Source of Truth               Cache/Queue              PDFs/Documents
       │                           │
       │                     ┌─────┴──────┐
       │                     ▼            ▼
       │                  BullMQ       Inngest
       │                     │
       └─────────────────────┼──────────────────────┐
                             │                      │
                             ▼                      ▼
                       Domain Workers          Typesense
                             │                      │
           ┌─────────────────┼──────────────┐       │
           ▼                 ▼              ▼       ▼
       Payments          Notifications   Reports  Search
           │                 │
           ▼                 ▼
     PayU/Razorpay/       WhatsApp/SMS
       Easebuzz

And locally:

MOBILE DEVICE
                       │
              ┌────────▼────────┐
              │ SQLite + WAL    │
              ├─────────────────┤
              │ Khata           │
              │ Billing         │
              │ Inventory       │
              │ Payments        │
              │ Ledger          │
              │ Sync Outbox     │
              └────────┬────────┘
                       │
                    Sync API
                       │
                       ▼
                  PostgreSQL

The most important implementation rule

Do not build this as a CRUD application.

Build it as a transactional business operating system where:

Invoice
    ↓
Inventory
    ↓
Receivable
    ↓
Payment
    ↓
Accounting
    ↓
Notification
    ↓
Reporting
    ↓
Audit

are connected through domain events and immutable financial/stock ledgers.

That architecture gives you the foundation to start with a Khatabook-like product, but later expand the exact same platform into POS + e-commerce + inventory + accounting + payment gateway + merchant finance + CRM + marketing automation + AI business assistant without replacing the core database model.
make sure everthing is working end to end without breaking or hampering the any services or features after implementation application working as unified perfect worlflow application if any features is already implement only update and advancing the exisitng features with cureent plan also implenment unified desing components for UI/UX with
available desing system and implement polish advance enhanced design components of UI/UX which loads or intract with real data and services.
