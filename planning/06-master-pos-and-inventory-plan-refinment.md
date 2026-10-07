
Plan 1


The actual implementation blueprint.

1. Core architecture

For your platform, use this separation:

Product
  │
  ├── Product Variant
  │       │
  │       ├── SKU
  │       ├── Barcode(s)
  │       ├── Price
  │       ├── Tax
  │       ├── Images
  │       └── Variant Attributes
  │
  └── Inventory Item
          │
          ├── Warehouse
          ├── Store
          ├── Bin
          ├── Batch/Lot
          ├── Serial Number
          ├── Reserved Stock
          └── Stock Ledger

The key rule is:

> A Product is a catalog concept. A ProductVariant is a sellable SKU. Inventory belongs to the SKU, not directly to the parent product.




---

2. Recommended Prisma schema

For SQLite + Prisma, I recommend starting with the following core schema.

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum ProductStatus {
  DRAFT
  ACTIVE
  INACTIVE
  ARCHIVED
}

enum ProductKind {
  PHYSICAL
  DIGITAL
  SERVICE
  SUBSCRIPTION
  BUNDLE
  COMPOSITE
}

enum VariantMode {
  SIMPLE
  VARIANT
  CONFIGURABLE
  BUNDLE
  COMPOSITE
}

enum AttributeType {
  TEXT
  NUMBER
  DECIMAL
  BOOLEAN
  SELECT
  MULTI_SELECT
  COLOR
  SIZE
  WEIGHT
  LENGTH
  VOLUME
  DATE
  IMAGE
}

enum AttributeDisplayType {
  TEXT
  DROPDOWN
  RADIO
  SWATCH
  IMAGE_SWATCH
  BUTTON
  CHECKBOX
}

enum InventoryTracking {
  NONE
  STOCK
  BATCH
  SERIAL
  BATCH_AND_SERIAL
}

enum StockMovementType {
  PURCHASE
  SALE
  SALE_RETURN
  PURCHASE_RETURN
  TRANSFER_IN
  TRANSFER_OUT
  ADJUSTMENT_IN
  ADJUSTMENT_OUT
  DAMAGE
  EXPIRED
  RESERVED
  RELEASED
  OPENING
  STOCK_COUNT
}

enum ReferenceType {
  PURCHASE
  SALE
  RETURN
  TRANSFER
  ADJUSTMENT
  STOCK_COUNT
  MANUAL
  SYSTEM
}

enum BarcodeType {
  EAN13
  EAN8
  UPC_A
  UPC_E
  CODE128
  CODE39
  ITF14
  GS1_128
  QR
  CUSTOM
}

model Product {
  id                String        @id @default(cuid())
  name              String
  slug              String        @unique
  description       String?
  shortDescription  String?

  productKind       ProductKind   @default(PHYSICAL)
  variantMode       VariantMode   @default(SIMPLE)
  status            ProductStatus @default(DRAFT)

  brandId           String?
  categoryId        String?

  baseSku           String?
  basePrice         Decimal?
  costPrice         Decimal?
  mrp               Decimal?

  taxRate           Decimal?

  weight            Decimal?
  length            Decimal?
  width             Decimal?
  height            Decimal?

  trackInventory    Boolean       @default(true)
  inventoryTracking InventoryTracking @default(STOCK)

  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  brand             Brand?        @relation(fields: [brandId], references: [id])
  category          Category?     @relation(fields: [categoryId], references: [id])

  variants          ProductVariant[]
  attributes        ProductAttributeValue[]
  images            ProductImage[]

  bundles           BundleComponent[] @relation("BundleProduct")
  components        BundleComponent[] @relation("ComponentProduct")

  @@index([categoryId])
  @@index([brandId])
  @@index([status])
  @@index([productKind])
}

model ProductVariant {
  id                String      @id @default(cuid())

  productId         String

  name              String?
  sku               String      @unique

  barcode           String?     @unique
  gtin              String?

  status            ProductStatus @default(ACTIVE)

  price             Decimal?
  salePrice         Decimal?
  costPrice         Decimal?
  mrp               Decimal?

  taxRate           Decimal?

  weight            Decimal?
  length            Decimal?
  width             Decimal?
  height            Decimal?

  trackInventory    Boolean     @default(true)
  inventoryTracking InventoryTracking @default(STOCK)

  allowBackorder    Boolean     @default(false)

  minOrderQuantity  Decimal     @default(1)
  maxOrderQuantity  Decimal?

  reorderPoint      Decimal?
  reorderQuantity   Decimal?

  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  product           Product     @relation(fields: [productId], references: [id], onDelete: Cascade)

  values            VariantAttributeValue[]
  barcodes          VariantBarcode[]
  images            VariantImage[]

  inventory         InventoryStock[]
  movements         StockMovement[]

  batches           InventoryBatch[]
  serialNumbers     SerialNumber[]

  priceRules        VariantPriceRule[]

  @@index([productId])
  @@index([status])
  @@index([productId, status])
}


---

3. Dynamic variant attributes

Do not create:

color
size
material
flavor
storage
ram

as columns in ProductVariant.

Instead:

model VariantAttribute {
  id              String   @id @default(cuid())

  name            String
  code            String   @unique

  type            AttributeType
  displayType     AttributeDisplayType

  isRequired      Boolean  @default(false)
  isVariant       Boolean  @default(true)
  isFilterable    Boolean  @default(true)
  isSearchable    Boolean  @default(false)

  sortOrder       Int      @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  values          VariantAttributeOption[]
}

model VariantAttributeOption {
  id              String   @id @default(cuid())

  attributeId     String

  label           String
  value           String

  code            String?

  colorHex        String?
  imageUrl        String?

  sortOrder       Int      @default(0)

  attribute       VariantAttribute
    @relation(fields: [attributeId], references: [id], onDelete: Cascade)

  variantValues   VariantAttributeValue[]

  @@index([attributeId])
  @@unique([attributeId, value])
}

model VariantAttributeValue {
  id              String   @id @default(cuid())

  variantId       String
  optionId        String

  variant         ProductVariant
    @relation(fields: [variantId], references: [id], onDelete: Cascade)

  option          VariantAttributeOption
    @relation(fields: [optionId], references: [id], onDelete: Cascade)

  @@unique([variantId, optionId])
  @@index([variantId])
  @@index([optionId])
}

This allows:

Color
 ├── Black
 ├── Red
 └── Blue

Size
 ├── S
 ├── M
 ├── L
 └── XL

Material
 ├── Cotton
 └── Polyester

without changing your database schema.


---

4. Example variant

A variant can then be represented as:

SKU: TSH-BLK-M

Color = Black
Size = Medium
Material = Cotton

Database relationship:

ProductVariant
      │
      ├── VariantAttributeValue
      │       └── Black
      │
      ├── VariantAttributeValue
      │       └── Medium
      │
      └── VariantAttributeValue
              └── Cotton


---

5. Barcode system

Do not limit yourself to one barcode.

model VariantBarcode {
  id          String      @id @default(cuid())

  variantId   String

  barcode     String
  type        BarcodeType

  isPrimary   Boolean     @default(false)
  isActive    Boolean     @default(true)

  source      String?

  createdAt   DateTime    @default(now())

  variant     ProductVariant
    @relation(fields: [variantId], references: [id], onDelete: Cascade)

  @@unique([barcode])
  @@index([variantId])
}

A single SKU could have:

EAN-13
UPC
Supplier Barcode
Internal Barcode
Warehouse Barcode
POS Barcode


---

6. Warehouse structure

Inventory needs physical locations.

model Warehouse {
  id          String   @id @default(cuid())

  name        String
  code        String   @unique

  address     String?

  isActive    Boolean  @default(true)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  locations   InventoryLocation[]
  inventory   InventoryStock[]
}

model InventoryLocation {
  id           String   @id @default(cuid())

  warehouseId  String

  name         String
  code         String

  type         String?

  isActive     Boolean  @default(true)

  warehouse    Warehouse
    @relation(fields: [warehouseId], references: [id], onDelete: Cascade)

  inventory    InventoryStock[]

  @@unique([warehouseId, code])
  @@index([warehouseId])
}

Example:

Warehouse Mumbai
│
├── A-01
│   ├── Rack 1
│   ├── Rack 2
│   └── Rack 3
│
├── A-02
└── B-01


---

7. Inventory stock

model InventoryStock {
  id            String   @id @default(cuid())

  variantId     String
  warehouseId   String
  locationId    String?

  quantity      Decimal  @default(0)
  reserved      Decimal  @default(0)

  damaged       Decimal  @default(0)
  incoming      Decimal  @default(0)

  reorderPoint  Decimal?
  reorderQty    Decimal?

  updatedAt     DateTime @updatedAt

  variant       ProductVariant
    @relation(fields: [variantId], references: [id], onDelete: Cascade)

  warehouse     Warehouse
    @relation(fields: [warehouseId], references: [id], onDelete: Cascade)

  location      InventoryLocation?
    @relation(fields: [locationId], references: [id])

  @@unique([variantId, warehouseId, locationId])
  @@index([variantId])
  @@index([warehouseId])
}

Available stock:

available =
quantity
- reserved
- damaged

Do not store available as an independently editable value.


---

8. Stock ledger

This is extremely important.

Never rely solely on:

InventoryStock.quantity

for accounting/auditing.

Maintain a ledger:

model StockMovement {
  id              String   @id @default(cuid())

  variantId       String

  warehouseId     String?
  locationId      String?

  type            StockMovementType

  quantity        Decimal

  balanceBefore   Decimal
  balanceAfter    Decimal

  referenceType   ReferenceType?
  referenceId     String?

  note            String?

  createdAt       DateTime @default(now())

  variant         ProductVariant
    @relation(fields: [variantId], references: [id], onDelete: Cascade)

  @@index([variantId, createdAt])
  @@index([warehouseId, createdAt])
  @@index([referenceId])
}

Example sale:

Before = 100

SALE - 3

After = 97

Ledger:

SALE
quantity = -3
balanceBefore = 100
balanceAfter = 97


---

9. Batch / lot inventory

For:

medicines

food

cosmetics

chemicals

FMCG

agricultural products


support batch tracking.

model InventoryBatch {
  id              String   @id @default(cuid())

  variantId       String

  batchNumber     String

  manufactureDate DateTime?
  expiryDate      DateTime?

  quantity        Decimal  @default(0)
  reserved        Decimal  @default(0)

  costPrice       Decimal?

  supplierId      String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  variant         ProductVariant
    @relation(fields: [variantId], references: [id], onDelete: Cascade)

  @@unique([variantId, batchNumber])
  @@index([expiryDate])
}

This enables:

FIFO
FEFO
Expiry alerts
Batch recall
Supplier traceability


---

10. Serial numbers

For:

mobile phones

laptops

electronics

appliances

machinery


use serial tracking.

model SerialNumber {
  id          String   @id @default(cuid())

  variantId   String

  serial      String   @unique

  status      String

  purchaseId  String?
  saleId      String?

  warrantyEnd DateTime?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  variant     ProductVariant
    @relation(fields: [variantId], references: [id], onDelete: Cascade)

  @@index([variantId])
}

Example:

iPhone 17 Pro
SKU: IP17P-BLK-256

Serial:
SN123456
SN123457
SN123458

Stock is then:

3 units

but each physical unit has an identity.


---

11. Product images

model ProductImage {
  id          String   @id @default(cuid())

  productId   String

  url         String
  alt         String?

  sortOrder   Int      @default(0)
  isPrimary   Boolean  @default(false)

  product     Product
    @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
}

model VariantImage {
  id          String   @id @default(cuid())

  variantId   String

  url         String
  alt         String?

  sortOrder   Int      @default(0)
  isPrimary   Boolean  @default(false)

  variant     ProductVariant
    @relation(fields: [variantId], references: [id], onDelete: Cascade)

  @@index([variantId])
}


---

12. Brand and category

model Brand {
  id          String    @id @default(cuid())

  name        String
  slug        String    @unique

  products    Product[]

  createdAt   DateTime  @default(now())
}

model Category {
  id          String    @id @default(cuid())

  name        String
  slug        String    @unique

  parentId    String?

  parent      Category? @relation(
    "CategoryTree",
    fields: [parentId],
    references: [id]
  )

  children    Category[] @relation("CategoryTree")

  products    Product[]

  @@index([parentId])
}

This supports:

Fashion
 └── Men
      └── Clothing
           └── T-Shirts


---

13. Product-level custom attributes

Some attributes aren't variants.

For example:

Brand = Samsung
Country = India
Warranty = 1 Year
Manufacturer = Samsung India

Use:

model ProductAttributeValue {
  id          String   @id @default(cuid())

  productId   String

  name        String
  value       String

  product     Product
    @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
}


---

14. Variant matrix algorithm

Suppose the user selects:

Color:
Black
Red

Size:
S
M
L

Material:
Cotton
Polyester

The Cartesian product is:

2 × 3 × 2 = 12

variants.

Conceptually:

type VariantOption = {
  attributeId: string;
  optionId: string;
};

function generateCombinations(
  groups: VariantOption[][]
) {
  return groups.reduce(
    (result, group) =>
      result.flatMap(existing =>
        group.map(option => [
          ...existing,
          option
        ])
      ),
    [[]] as VariantOption[][]
  );
}

Result:

Black / S / Cotton
Black / S / Polyester
Black / M / Cotton
Black / M / Polyester
Black / L / Cotton
Black / L / Polyester

Red / S / Cotton
Red / S / Polyester
Red / M / Cotton
Red / M / Polyester
Red / L / Cotton
Red / L / Polyester


---

15. But add a combination exclusion engine

You should not blindly generate every combination.

Create:

model VariantCombinationRule {
  id          String   @id @default(cuid())

  productId   String

  name        String?

  isAllowed   Boolean  @default(true)

  conditionJson String

  createdAt   DateTime @default(now())

  @@index([productId])
}

Example:

{
  "conditions": [
    {
      "attribute": "color",
      "value": "red"
    },
    {
      "attribute": "size",
      "value": "xxl"
    }
  ],
  "action": "exclude"
}

Result:

Red + XXL = unavailable


---

16. SKU generation

Don't use the database ID as the SKU.

Use a configurable generator:

TSH-BLK-M

Configuration:

PREFIX
+
ATTRIBUTE CODES
+
SEQUENCE

Example:

TSH-BLK-M-00125

Possible merchant configuration:

SKU Prefix:
TSH

Separator:
-

Color Code:
BLK

Size Code:
M

Sequence:
00125

Generated:

TSH-BLK-M-00125


---

17. SKU rules

Your API should reject:

duplicate SKU

and normalize:

abc-001
ABC-001

according to your SKU policy.

I recommend:

uppercase
trim whitespace
ASCII-safe
no uncontrolled spaces


---

18. Pricing architecture

Do not hardcode only one price.

Eventually you'll need:

MRP
Cost Price
Selling Price
Sale Price
Wholesale Price
Retail Price
B2B Price
Marketplace Price
POS Price
Online Price
Subscription Price

For now:

model VariantPriceRule {
  id          String   @id @default(cuid())

  variantId   String

  channel     String
  priceType   String

  price       Decimal

  minQuantity Decimal?

  startsAt    DateTime?
  endsAt      DateTime?

  isActive    Boolean  @default(true)

  variant     ProductVariant
    @relation(fields: [variantId], references: [id], onDelete: Cascade)

  @@index([variantId])
}

Example:

Variant: TSH-BLK-M

POS       ₹499
Website   ₹479
Wholesale ₹420


---

19. Bundle products

Your platform also needs bundles.

Example:

School Kit

├── Notebook × 5
├── Pen × 3
├── Pencil × 2
└── Eraser × 1

Schema:

model BundleComponent {
  id              String   @id @default(cuid())

  bundleProductId String
  componentId     String

  quantity        Decimal

  bundleProduct   Product
    @relation(
      "BundleProduct",
      fields: [bundleProductId],
      references: [id],
      onDelete: Cascade
    )

  component       Product
    @relation(
      "ComponentProduct",
      fields: [componentId],
      references: [id],
      onDelete: Cascade
    )

  @@unique([bundleProductId, componentId])
}


---

20. Inventory calculation

For every variant:

On Hand
Reserved
Damaged
Incoming
Available

Formula:

Available =
OnHand
- Reserved
- Damaged

For ecommerce:

Sellable =
Available
- SafetyStock

Example:

On hand       100
Reserved       15
Damaged         3
Safety stock   10
------------------
Sellable       72


---

21. Reservation system

When an online order is created:

Order Created
     ↓
Reserve Stock
     ↓
Payment
     ↓
Confirmed
     ↓
Deduct Stock

If payment expires:

Reservation
     ↓
Release
     ↓
Available Stock +

This prevents overselling between your POS and ecommerce channels.


---

22. Multi-channel inventory

Your platform should eventually support:

Website
POS
Amazon
Flipkart
Shopify
Marketplace
WhatsApp
Mobile App

Each can consume the same inventory pool.

Example:

Warehouse = 100

Website reservation = 20
POS reservation     = 5
Amazon reservation  = 10

Available = 65


---

23. Product creation flow

Your UI should follow this sequence:

STEP 1
Basic Information

Name
Category
Brand
Product Type
Description

↓

STEP 2
Product Mode

Simple
Variant
Bundle
Composite
Digital
Service
Subscription

↓

STEP 3
Variant Attributes

Color
Size
Material
Storage
RAM
etc.

↓

STEP 4
Attribute Values

Black
Red
Blue

S
M
L
XL

↓

STEP 5
Generate Variants

↓

STEP 6
SKU / Barcode

↓

STEP 7
Pricing

↓

STEP 8
Opening Inventory

↓

STEP 9
Images

↓

STEP 10
Publish


---

24. Fast product entry for POS

For a retail store, don't force the user through ten screens.

Create a Quick Add Product flow:

┌──────────────────────────────┐
│ Quick Product                │
├──────────────────────────────┤
│ Name                         │
│ [ Coca Cola 500ml          ] │
│                              │
│ Barcode                      │
│ [ 8901234567890            ] │
│                              │
│ Purchase Price               │
│ [ ₹25                      ] │
│                              │
│ Selling Price                │
│ [ ₹40                      ] │
│                              │
│ Quantity                     │
│ [ 100                      ] │
│                              │
│ [ Save & Continue ]           │
└──────────────────────────────┘

The system can create:

Product
+
Simple ProductVariant
+
Barcode
+
Opening Stock

in one transaction.


---

25. Barcode scanning flow

POS:

SCAN
 ↓
Barcode lookup
 ↓
Variant found?
 ├── YES → Add to cart
 │
 └── NO
       ↓
   Quick Add Product

Barcode lookup should search:

VariantBarcode.barcode
ProductVariant.barcode
ProductVariant.sku

in that order.


---

26. Critical validation rules

Your backend should validate:

Product

name required
category required where applicable
productKind valid

Variant

SKU unique
SKU required for sellable products
price >= 0
cost >= 0
stock >= 0 unless adjustment

Barcode

barcode unique
valid check digit where applicable
correct length
correct character set

Variant combination

no duplicate attribute
no duplicate combination
only valid options

Inventory

cannot sell more than available
unless allowBackorder = true

Serial

serial unique
cannot sell same serial twice

Batch

expired batch cannot be sold
unless explicitly overridden


---

27. SQLite-specific recommendation

Since you're using SQLite locally, don't attempt to make SQLite behave like PostgreSQL.

Use:

SQLite
+
Prisma
+
single-writer transaction model
+
WAL mode
+
proper indexes

For local POS:

SQLite
   ↓
Offline transactions
   ↓
Sync queue
   ↓
Cloud database

This fits your broader offline-first architecture very well.


---

28. Transaction example

When a POS sale happens:

BEGIN TRANSACTION

1. Find barcode
2. Resolve ProductVariant
3. Check stock
4. Create Sale
5. Create SaleItem
6. Reserve/deduct stock
7. Create StockMovement
8. Update InventoryStock
9. Create payment
10. Commit

COMMIT

If any operation fails:

ROLLBACK

This is much safer than updating inventory independently from the sale.


---

29. Recommended service architecture

For Next.js:

src/
├── modules/
│   ├── products/
│   │   ├── product.service.ts
│   │   ├── product.repository.ts
│   │   ├── product.validation.ts
│   │   └── product.types.ts
│   │
│   ├── variants/
│   │   ├── variant.service.ts
│   │   ├── variant-generator.ts
│   │   ├── combination-engine.ts
│   │   └── sku-generator.ts
│   │
│   ├── barcode/
│   │   ├── barcode.service.ts
│   │   ├── barcode-validator.ts
│   │   └── barcode-generator.ts
│   │
│   ├── inventory/
│   │   ├── inventory.service.ts
│   │   ├── stock.service.ts
│   │   ├── stock-ledger.service.ts
│   │   ├── reservation.service.ts
│   │   └── transfer.service.ts
│   │
│   ├── warehouse/
│   │
│   ├── batches/
│   │
│   └── serials/
│
└── lib/
    └── prisma.ts


---

30. API structure

I recommend:

POST   /api/products
GET    /api/products
GET    /api/products/:id
PATCH  /api/products/:id
DELETE /api/products/:id

POST   /api/products/:id/variants
POST   /api/products/:id/variants/generate
PATCH  /api/variants/:id
DELETE /api/variants/:id

POST   /api/variants/:id/barcodes
GET    /api/barcodes/:barcode

GET    /api/inventory
GET    /api/inventory/:variantId
POST   /api/inventory/adjust
POST   /api/inventory/transfer
POST   /api/inventory/reserve
POST   /api/inventory/release

GET    /api/inventory/ledger
GET    /api/inventory/batches
GET    /api/inventory/serials


---

31. The most important design decision

For your particular platform, I would not copy Amazon's database model exactly.

Use:

Amazon-compatible variation UX
              +
Flexible internal variant engine
              +
POS inventory engine
              +
Warehouse engine
              +
Barcode engine
              +
Batch/serial tracking
              +
Offline SQLite synchronization

That will let the same engine handle:

T-Shirt
→ Color + Size

Laptop
→ RAM + Storage + CPU + Color

Coca-Cola
→ Bottle Size

Medicine
→ Strength + Pack Size

Furniture
→ Color + Material + Size

Course
→ Language + Duration

SaaS
→ Plan + Billing Cycle

Service
→ Duration + Service Level

Subscription
→ Plan + Billing Period

Digital Product
→ License Type + Edition

Bundle
→ Components

Next implementation layer

The next step should be the complete Prisma schema, including the missing business entities around this core:

Organization / Tenant
      ↓
Product
      ↓
Variant
      ↓
SKU
      ↓
Barcode
      ↓
Warehouse
      ↓
Location/Bin
      ↓
Batch / Serial
      ↓
Inventory
      ↓
Reservation
      ↓
Stock Ledger
      ↓
Purchase
      ↓
Sales Order
      ↓
POS Invoice
      ↓
Return
      ↓
Accounting Journal

That is the point where this becomes a complete ecommerce + POS + billing + inventory foundation, rather than merely a product-variant table.



Plan 2

For platform, I would design the foundation as a unified commerce operating system rather than separate ecommerce, POS, billing, and inventory modules.

The central principle is:

COMMERCE PLATFORM
                           │
          ┌────────────────┼────────────────┐
          │                │                │
       CATALOG          COMMERCE         INVENTORY
          │                │                │
 Product/Variant       Cart/Order       Stock
 SKU/Barcode           Checkout         Warehouse
 Pricing               Payment          Batch
 Tax                   Invoice          Serial
 Promotions            Returns          Transfer
          │                │                │
          └────────────────┼────────────────┘
                           │
                       ACCOUNTING
                           │
                  Ledger / Receivable
                  Payable / Tax / Journal

For your Next.js + Prisma + SQLite application, this should be an offline-first transactional core, with cloud synchronization added around it.


---

1. Complete module architecture

src/
├── modules/
│
├── catalog/
│   ├── products
│   ├── variants
│   ├── attributes
│   ├── categories
│   ├── brands
│   ├── collections
│   ├── bundles
│   ├── digital-products
│   └── services
│
├── pricing/
│   ├── price-lists
│   ├── price-rules
│   ├── discounts
│   ├── coupons
│   ├── promotions
│   └── tax
│
├── inventory/
│   ├── stock
│   ├── warehouse
│   ├── locations
│   ├── batches
│   ├── serials
│   ├── transfers
│   ├── adjustments
│   ├── reservations
│   ├── stock-count
│   └── stock-ledger
│
├── purchasing/
│   ├── suppliers
│   ├── purchase-orders
│   ├── goods-receipts
│   ├── purchase-invoices
│   └── purchase-returns
│
├── sales/
│   ├── carts
│   ├── quotes
│   ├── orders
│   ├── order-items
│   ├── invoices
│   ├── payments
│   ├── shipments
│   └── returns
│
├── pos/
│   ├── terminals
│   ├── sessions
│   ├── cash-drawer
│   ├── sales
│   ├── offline-sales
│   └── receipts
│
├── customers/
│   ├── customers
│   ├── addresses
│   ├── wallets
│   ├── credits
│   └── loyalty
│
├── accounting/
│   ├── chart-of-accounts
│   ├── journals
│   ├── ledger
│   ├── receivables
│   ├── payables
│   └── reconciliation
│
├── subscriptions/
│   ├── plans
│   ├── subscriptions
│   ├── billing-cycles
│   └── renewals
│
├── marketplace/
│   ├── sellers
│   ├── listings
│   ├── commissions
│   └── settlements
│
├── fulfillment/
│   ├── shipments
│   ├── packages
│   ├── carriers
│   └── tracking
│
└── sync/
    ├── outbox
    ├── sync-queue
    ├── conflict-resolution
    └── cloud-sync


---

2. Tenant architecture

Since you're building a SaaS platform, every business should have an organization.

Platform
   │
   ├── Organization A
   │      ├── Stores
   │      ├── Warehouses
   │      ├── Products
   │      ├── Customers
   │      └── Orders
   │
   ├── Organization B
   │
   └── Organization C

Core:

model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique

  currency    String   @default("INR")
  timezone    String   @default("Asia/Kolkata")
  countryCode String   @default("IN")

  isActive    Boolean  @default(true)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

Every business-owned entity should eventually carry:

organizationId

This is essential for multi-tenant isolation.


---

3. Product architecture

The catalog hierarchy should be:

Organization
    │
    └── Catalog
          │
          ├── Category
          ├── Brand
          ├── Collection
          │
          └── Product
                │
                ├── Product Attributes
                │
                └── Variants
                      │
                      ├── SKU
                      ├── Barcode
                      ├── Price
                      ├── Tax
                      └── Inventory


---

4. Product types

Use:

PHYSICAL
DIGITAL
SERVICE
SUBSCRIPTION
BUNDLE
COMPOSITE

Physical

T-Shirt
Laptop
Mobile
Food
Furniture

Digital

PDF
Course
Video
Software
License

Service

Consultation
Repair
Installation
Photography

Subscription

Basic Monthly
Pro Monthly
Enterprise Annual

Bundle

School Kit
Laptop Package
Festival Package

Composite

Gaming PC

where inventory is consumed from components.


---

5. Product + variant

The previous Product / ProductVariant architecture remains the foundation.

Important rule:

Product ≠ SKU

Instead:

Product
  ↓
Variant
  ↓
SKU

Example:

Nike T-Shirt

TSH-BLK-S
TSH-BLK-M
TSH-BLK-L
TSH-RED-S
TSH-RED-M
TSH-RED-L

Each variant can have independent:

price
cost
MRP
tax
barcode
weight
dimensions
stock
images
batch
serial


---

6. SKU is the central inventory identity

Everything should ultimately resolve to a SKU/variant.

Barcode
   ↓
SKU
   ↓
ProductVariant
   ↓
Inventory

POS should never directly manipulate a parent Product.


---

7. Barcode architecture

Support:

EAN-8
EAN-13
UPC-A
UPC-E
ITF-14
GS1-128
CODE-128
CODE-39
QR
CUSTOM

And multiple identifiers:

Manufacturer barcode
Supplier barcode
Internal barcode
POS barcode
Marketplace barcode
Warehouse barcode

Example:

ProductVariant
│
├── SKU
├── EAN
├── Internal Barcode
├── Supplier Barcode
└── Marketplace ID


---

8. Inventory architecture

This is the most important part.

Inventory
│
├── Warehouse
│     └── Location
│           └── Bin
│
├── Stock
│
├── Reservation
│
├── Batch
│
├── Serial
│
└── Stock Ledger

Example:

Mumbai Warehouse
│
├── Rack A
│   ├── Bin A01
│   ├── Bin A02
│   └── Bin A03
│
└── Rack B


---

9. Inventory quantities

Do not use only:

quantity

Track:

onHand
reserved
damaged
incoming
available
safetyStock

Formula:

available =
    onHand
  - reserved
  - damaged

And:

sellable =
    available
  - safetyStock


---

10. Inventory ledger

Every stock change must create an immutable movement.

Opening
   +100

Purchase
   +50

Sale
   -10

Return
   +2

Damage
   -3

Transfer Out
   -20

Final:

119

Never allow users to directly edit historical ledger entries.

Corrections should create another movement.


---

11. Inventory transaction

Every inventory-changing operation should follow:

BEGIN TRANSACTION

Validate
↓
Lock/check stock
↓
Calculate quantity
↓
Create business document
↓
Create stock movement
↓
Update stock snapshot
↓
Create audit event

COMMIT

For SQLite, this is particularly important because concurrent POS/order operations can otherwise produce inconsistent inventory.


---

12. Warehouse transfer

Example:

Warehouse A
Stock = 100

Transfer 20

Warehouse A
100 → 80

Warehouse B
50 → 70

Create two movements:

TRANSFER_OUT -20
TRANSFER_IN +20

with the same transfer ID.


---

13. Batch inventory

For FMCG/medicine/cosmetics:

SKU
│
├── Batch A
│   ├── Qty 100
│   └── Expiry 2027-01
│
├── Batch B
│   ├── Qty 200
│   └── Expiry 2027-06
│
└── Batch C
    ├── Qty 150
    └── Expiry 2028-01

Support:

FIFO
FEFO
Manual batch selection
Expiry warnings
Near-expiry reports
Batch recall

For medicines/food, FEFO should generally be preferred.


---

14. Serial inventory

Electronics:

SKU:
IPH17-BLK-256

Serials:

SN001
SN002
SN003
SN004

A sale consumes one specific serial.

This enables:

Warranty
Repair
Return
Replacement
Recall
Ownership history


---

15. Purchasing

Complete purchasing workflow:

Supplier
   ↓
Purchase Request
   ↓
Purchase Order
   ↓
Goods Receipt
   ↓
Quality Check
   ↓
Inventory Receipt
   ↓
Purchase Invoice
   ↓
Supplier Payment

Do not add stock when merely creating a Purchase Order.

Stock changes at:

Goods Receipt


---

16. Purchase Order

PO-00001

Supplier: ABC Traders

SKU             Qty
--------------------------------
TSH-BLK-M       100
TSH-RED-M        50
JEANS-BLK-32     30

Status:

DRAFT
SENT
PARTIALLY_RECEIVED
RECEIVED
CANCELLED
CLOSED


---

17. Goods receipt

Suppose PO says:

100 units

but supplier sends:

80

Then:

Ordered = 100
Received = 80
Remaining = 20

Inventory receives only 80.


---

18. Sales architecture

Unified order model:

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
Fulfillment
 ↓
Shipment
 ↓
Delivery

But POS can skip some online-specific steps:

POS
 ↓
Sale
 ↓
Payment
 ↓
Invoice
 ↓
Stock deduction

Both should eventually produce the same accounting/inventory events.


---

19. Sales channels

Add:

WEBSITE
POS
MOBILE_APP
MARKETPLACE
WHATSAPP
PHONE
MANUAL
API

An order should contain:

channel
source
salesPerson
store
terminal
customer


---

20. Order state machine

Use a controlled state machine.

DRAFT
 ↓
PENDING_PAYMENT
 ↓
PAID
 ↓
CONFIRMED
 ↓
PROCESSING
 ↓
PACKED
 ↓
SHIPPED
 ↓
DELIVERED

Alternative paths:

CANCELLED
FAILED
RETURN_REQUESTED
RETURNED
REFUNDED

Do not allow arbitrary status changes from the UI.


---

21. Cart

Cart should support:

ProductVariant
Quantity
Price
Discount
Tax
Coupon
Notes

Never trust price supplied by the browser.

At checkout:

Client price
      ↓
Server re-fetches SKU
      ↓
Recalculates price
      ↓
Recalculates discount
      ↓
Recalculates tax
      ↓
Creates order


---

22. Reservation

For ecommerce:

Cart
 ↓
Checkout
 ↓
Reserve inventory
 ↓
Payment

If payment succeeds:

Reservation → Sale

If payment fails:

Reservation → Released

Reservation should have expiration:

expiresAt


---

23. Pricing engine

You need more than:

price

Support:

Base Price
MRP
Cost
Sale Price
Wholesale
Retail
B2B
POS
Online
Marketplace
Customer Group
Quantity Price

Example:

Retail       ₹500
Wholesale    ₹450
B2B          ₹420
Online       ₹479


---

24. Quantity pricing

Example:

1–4     ₹100
5–9      ₹90
10–49    ₹80
50+      ₹70

This is extremely useful for B2B.


---

25. Discount engine

Support:

Percentage
Fixed
Buy X Get Y
Tier Discount
Category Discount
Product Discount
Cart Discount
Customer Discount
First Order
Coupon
Campaign

Example:

BUY 2 GET 1

or:

₹500 OFF above ₹5,000


---

26. Tax engine — India

Since you're targeting India, design for:

GST
CGST
SGST
IGST
UTGST
CESS

Tax configuration should support:

HSN
SAC
GST rate
Tax inclusive
Tax exclusive
Interstate
Intrastate

Example:

Product price = ₹1,000

GST = 18%

CGST = 9%
SGST = 9%

Interstate:

IGST = 18%

Tax should be calculated server-side.


---

27. Invoice

Invoice should be immutable after finalization.

Example:

INV-2026-000001

Customer
GSTIN
Billing Address
Shipping Address

Items
Subtotal
Discount
Taxable Amount
CGST
SGST
IGST
Round Off
Grand Total

Payment
Balance


---

28. Invoice numbering

Don't use random IDs for invoice numbers.

Support:

INV-2026-000001
INV-2026-000002

and configurable sequences:

Store A:
INV-A-2026-000001

Store B:
INV-B-2026-000001

You should make numbering configurable by:

organization
store
financial year
document type


---

29. Payment architecture

Payment must be independent of order.

Order
  │
  └── Payment
        ├── Cash
        ├── UPI
        ├── Card
        ├── Bank
        ├── Wallet
        ├── Credit
        └── Gateway

One order can have multiple payments.

Example:

Total = ₹10,000

Cash = ₹2,000
UPI  = ₹5,000
Card = ₹3,000


---

30. Split payment

POS absolutely needs this.

Invoice = ₹1,500

Cash = ₹500
UPI  = ₹700
Card = ₹300

Payment records:

PAY-001 Cash ₹500
PAY-002 UPI  ₹700
PAY-003 Card ₹300


---

31. Customer credit / Khata

Since you're also targeting Khatabook-style business functionality, support:

Customer
 ↓
Credit Account
 ↓
Debit
Credit
Balance

Example:

Sale on credit:
₹2,000

Customer balance:
₹2,000 DR

Payment:

₹1,000

Balance:
₹1,000

This should integrate with accounts receivable.


---

32. POS architecture

Organization
 │
 └── Store
      │
      ├── Terminal 1
      ├── Terminal 2
      └── Terminal 3

Each terminal has:

POSSession


---

33. POS session

Opening:

Cash drawer:
₹10,000

Sales:

Cash sales:
₹25,000

Cash refunds:

₹2,000

Expected:

₹33,000

Closing:

Actual = ₹32,950

Difference:

-₹50

This creates a cash variance record.


---

34. POS cash drawer

Track:

Opening cash
Cash sale
Cash refund
Cash in
Cash out
Expense
Cash withdrawal
Closing cash

Every cash movement should be auditable.


---

35. Offline POS

This is particularly important for your SQLite architecture.

CLOUD
               │
        ┌──────┴──────┐
        │             │
     Sync API      Admin
        │
        │
     LOCAL DEVICE
        │
      SQLite
        │
    ┌───┴────┐
    │        │
   POS    Inventory

When offline:

POS sale
 ↓
SQLite
 ↓
Outbox
 ↓
Later synchronization


---

36. Outbox pattern

Create:

SyncOutbox

with:

id
eventType
entityType
entityId
payload
status
attempts
lastError
createdAt
syncedAt

Example:

SALE_CREATED
INVENTORY_DEDUCTED
PAYMENT_CREATED
INVOICE_CREATED

When internet returns:

Outbox
 ↓
Sync API
 ↓
Cloud
 ↓
ACK
 ↓
Mark synced


---

37. Idempotency

This is critical.

Suppose the mobile POS sends:

SALE-123

then loses network connection.

It retries.

Without idempotency:

Sale created twice
Stock deducted twice
Payment duplicated

Every important operation should have:

idempotencyKey

Example:

POS-DEVICE-A-SESSION-45-TXN-000123

Cloud checks:

Already processed?
    YES → return existing result
    NO  → process


---

38. Accounting architecture

Eventually:

Sales
Purchases
Payments
Inventory
Expenses
Returns
Tax

must feed accounting.

Basic model:

Chart of Accounts
       ↓
Journal Entry
       ↓
Journal Lines
       ↓
General Ledger


---

39. Double-entry example

Cash sale:

Debit:
Cash             ₹1,180

Credit:
Sales            ₹1,000
GST Payable        ₹180

Inventory cost:

Debit:
COGS              ₹600

Credit:
Inventory         ₹600

This gives you proper accounting integration.


---

40. Inventory accounting

Inventory should not simply disappear when sold.

Sale:

Revenue
+
COGS
-
Inventory

Example:

Selling price = ₹1,000
Cost price    = ₹600
GST           = ₹180

Accounting:

Dr Cash                1,180
   Cr Sales             1,000
   Cr GST Payable         180

Dr COGS                   600
   Cr Inventory            600


---

41. Returns

Support separate flows:

Sales Return
Purchase Return
Exchange
Refund
Replacement

Customer return:

Delivered
 ↓
Return Requested
 ↓
Approved
 ↓
Received
 ↓
Inspection
 ↓
Restock / Damaged
 ↓
Refund


---

42. Return inventory decision

Returned product should not automatically become sellable.

Inspection:

GOOD
DAMAGED
DEFECTIVE
OPEN_BOX
MISSING_PARTS
SCRAP

Then:

GOOD → inventory
DAMAGED → damaged stock
SCRAP → write-off


---

43. Shipment architecture

For ecommerce:

Order
 ↓
Fulfillment
 ↓
Package
 ↓
Shipment
 ↓
Carrier
 ↓
Tracking
 ↓
Delivered

Package can contain selected order items.

This is necessary for partial shipments.


---

44. Multiple shipments

Order:

3 products

Shipment 1:

Product A
Product B

Shipment 2:

Product C

Order remains:

PARTIALLY_SHIPPED

until all items ship.


---

45. Subscription architecture

Your same catalog should support:

Product
 ↓
Subscription Plan
 ↓
Subscription
 ↓
Billing Cycle
 ↓
Invoice
 ↓
Payment

Example:

Pro
₹999/month

or:

Pro
₹9,999/year

Don't create separate product tables for subscriptions.


---

46. Digital products

Digital product can have:

Product
 ↓
Digital Asset
 ↓
License/Entitlement
 ↓
Customer

After payment:

Payment confirmed
 ↓
Entitlement created
 ↓
Download/access allowed


---

47. Service products

For services:

Service
 ↓
Booking / Job
 ↓
Assignment
 ↓
Completion
 ↓
Invoice
 ↓
Payment

Example:

AC Installation
₹1,500

No physical inventory is required.


---

48. Bundle inventory

Suppose:

Festival Kit

contains:

Shirt × 1
Pants × 1
Belt × 1

Selling one bundle deducts:

Shirt -1
Pants -1
Belt -1

The bundle itself doesn't necessarily need independent physical stock.


---

49. Composite/BOM

For manufacturing-style products:

Gaming PC

CPU × 1
Motherboard × 1
RAM × 2
SSD × 1
GPU × 1
PSU × 1

When assembled:

Components ↓
Finished Product ↑

This is different from a normal ecommerce bundle and should therefore have separate semantics.


---

50. Product lifecycle

DRAFT
 ↓
ACTIVE
 ↓
INACTIVE
 ↓
ARCHIVED

Never hard-delete products that have historical sales.

Use archive/deactivation.


---

51. Audit system

Every important mutation:

Who
What
When
Where
Before
After
Reason

Example:

USER:
Admin

ACTION:
INVENTORY_ADJUSTMENT

SKU:
TSH-BLK-M

OLD:
100

NEW:
95

REASON:
Damaged stock

TIMESTAMP:
...


---

52. Permissions

Recommended roles:

OWNER
ADMIN
MANAGER
INVENTORY_MANAGER
PURCHASER
CASHIER
SALES
ACCOUNTANT
WAREHOUSE_OPERATOR
VIEWER

Example:

Cashier
✓ Sell
✓ Refund within limit
✓ View products
✗ Modify cost price
✗ Adjust inventory
✗ Delete invoice
✗ Change tax


---

53. Dashboard metrics

Your dashboard should calculate:

Sales

Today's sales
Orders
Average order value
Gross sales
Net sales
Refunds

Inventory

Stock value
Low stock
Out of stock
Dead stock
Fast-moving
Slow-moving
Expiring

Purchasing

Purchase value
Pending POs
Supplier payable

Finance

Receivable
Payable
Cash
Bank
UPI
Profit
Tax


---

54. Inventory reports

Build these from the ledger rather than manually maintained counters:

Stock Summary
Stock Valuation
Stock Movement
Stock Aging
Low Stock
Out of Stock
Dead Stock
Fast Moving
Slow Moving
Batch Expiry
Serial Register
Warehouse Transfer
Stock Adjustment
Inventory Reconciliation


---

55. Product search

Your POS lookup needs extremely fast search.

Priority:

Exact Barcode
 ↓
Exact SKU
 ↓
Exact Product Code
 ↓
Prefix SKU
 ↓
Product Name
 ↓
Fuzzy Search

For your larger architecture, SQLite can handle local POS search while your cloud system can later use Typesense for catalog search.


---

56. Recommended local indexes

At minimum:

Product.slug
Product.status
Product.categoryId

ProductVariant.sku
ProductVariant.productId
ProductVariant.status

VariantBarcode.barcode

InventoryStock.variantId
InventoryStock.warehouseId

StockMovement.variantId
StockMovement.createdAt

Order.orderNumber
Order.customerId
Order.createdAt

Invoice.invoiceNumber

Payment.reference


---

57. Avoid this architecture

Do not create:

products
product_colors
product_sizes
product_inventory
product_sales
product_orders

with duplicated product information everywhere.

Instead:

Product
ProductVariant
InventoryStock
StockMovement
Order
OrderItem
Invoice
Payment

with relationships.


---

58. Golden transaction architecture

For a POS sale:

POS SALE
                   │
                   ▼
               Order
                   │
             ┌─────┴─────┐
             ▼           ▼
        OrderItem      Payment
             │
             ▼
        ProductVariant
             │
             ▼
        InventoryStock
             │
             ▼
        StockMovement
             │
             ▼
          Invoice
             │
             ▼
        Accounting
             │
             ▼
          AuditLog

One business event can therefore drive the entire platform.


---

59. Recommended event model

Use domain events internally:

PRODUCT_CREATED
VARIANT_CREATED

STOCK_RECEIVED
STOCK_ADJUSTED
STOCK_TRANSFERRED
STOCK_RESERVED
STOCK_RELEASED
STOCK_DEDUCTED

ORDER_CREATED
ORDER_CONFIRMED
ORDER_CANCELLED
ORDER_COMPLETED

PAYMENT_CREATED
PAYMENT_CONFIRMED
PAYMENT_FAILED
PAYMENT_REFUNDED

INVOICE_CREATED
INVOICE_FINALIZED

RETURN_CREATED
RETURN_APPROVED
RETURN_RECEIVED
REFUND_CREATED

This will make later migration to BullMQ/Kafka/NATS much easier.


---

60. Recommended implementation phases

Phase 1 — Foundation

Organization
Users
Roles
Stores
Warehouses

Phase 2 — Catalog

Products
Categories
Brands
Attributes
Variants
SKU
Barcode
Images

Phase 3 — Inventory

Stock
Locations
Batches
Serials
Transfers
Adjustments
Reservations
Ledger

Phase 4 — Purchasing

Suppliers
Purchase Orders
Goods Receipts
Purchase Returns

Phase 5 — Sales

Cart
Orders
Order Items
Customers
Addresses

Phase 6 — POS

Terminals
Sessions
Cash Drawer
Offline Transactions
Receipts

Phase 7 — Billing

Invoices
Payments
Refunds
Credit
Tax

Phase 8 — Accounting

Chart of Accounts
Journal
Ledger
Receivables
Payables
COGS
Inventory valuation

Phase 9 — Ecommerce

Storefront
Checkout
Coupons
Promotions
Shipping
Tracking
Customer account

Phase 10 — Advanced

Subscriptions
Digital Products
Services
Bundles
BOM
Marketplace
Multi-channel inventory
Cloud sync
Analytics


---

61. The actual database relationship

The final system should look like this:

ORGANIZATION
                              │
          ┌───────────────────┼────────────────────┐
          │                   │                    │
        STORES            WAREHOUSES            USERS
          │                   │
       POS TERM.          LOCATIONS
          │                   │
       POS SESSION       INVENTORY
          │                   │
          └──────────┐   ┌───┘
                     │   │
                    SKU / VARIANT
                     │
             ┌───────┼────────┐
             │       │        │
           PRICE   BARCODE   TAX
             │       │
             │     SCAN
             │       │
             └── PRODUCT
                    │
             ┌──────┴───────┐
             │              │
           ORDER          PURCHASE
             │              │
         ORDER ITEM       PO ITEM
             │              │
          PAYMENT        RECEIPT
             │              │
          INVOICE        STOCK IN
             │              │
             └──────┬───────┘
                    │
               STOCK LEDGER
                    │
          ┌─────────┼──────────┐
          │         │          │
        BATCH     SERIAL     TRANSFER
          │         │          │
          └─────────┼──────────┘
                    │
                ACCOUNTING
                    │
              JOURNAL ENTRY
                    │
                GENERAL LEDGER


---

62. Critical rule: one source of truth

The biggest architectural decision I recommend for your platform is:

Product source of truth

ProductVariant

Inventory source of truth

StockMovement

with:

InventoryStock

as the materialized/current stock snapshot.

Sales source of truth

Order

Billing source of truth

Invoice

Payment source of truth

Payment

Accounting source of truth

JournalEntry + JournalLine

Sync source of truth

Outbox/Event

This prevents different modules from maintaining conflicting versions of the same business state.


---

63. Recommended technology stack for your implementation

Given the architecture you're already building:

Frontend
──────────────
Next.js
React
TanStack Query
Mantine
TanStack Table

Local database
──────────────
SQLite
Prisma

Cloud database
──────────────
PostgreSQL / Supabase

Object storage
──────────────
Cloudflare R2 / Supabase Storage

Search
──────────────
Typesense

Cache
──────────────
Redis

Background jobs
──────────────
BullMQ / Inngest

Webhook infrastructure
──────────────
Svix

Payments
──────────────
Razorpay
PayU
Easebuzz

Accounting integration
──────────────
BigCapital / accounting API

Observability
──────────────
OpenTelemetry
Prometheus
Grafana

The important part is that SQLite should remain the local transactional database, not the place where cloud synchronization logic is mixed directly into every feature.


---

64. Final architecture

I would ultimately build your platform as:

┌─────────────────────────┐
                  │       NEXT.JS APP       │
                  │                         │
                  │ Ecommerce │ POS │ Admin │
                  └────────────┬────────────┘
                               │
                        DOMAIN SERVICES
                               │
       ┌───────────────────────┼────────────────────────┐
       │                       │                        │
     CATALOG               COMMERCE                INVENTORY
       │                       │                        │
 Product/Variant          Cart/Order             Stock
 SKU/Barcode              Payment                 Warehouse
 Pricing                  Invoice                 Batch
 Tax                      Return                  Serial
       │                       │                        │
       └───────────────────────┼────────────────────────┘
                               │
                          ACCOUNTING
                               │
                          Journal/Ledger
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
             LOCAL SQLITE                 CLOUD
                 │                           │
             OUTBOX                    PostgreSQL
                 │                           │
             SYNC ENGINE               Supabase
                 │                           │
                 └───────────┬───────────────┘
                             │
                  ┌──────────┼──────────┐
                  │          │          │
                Redis     Typesense     R2
                  │          │          │
               Cache       Search      Assets

This gives you a foundation that can grow from a single offline retail POS into a multi-store ecommerce + inventory + billing + accounting + marketplace SaaS without having to redesign the product and inventory database later.

The next engineering artifact I recommend

The most useful next step is to turn this architecture into a single complete schema.prisma containing approximately 60–80 production tables/models, including:

multi-tenant organization

users/RBAC

stores/POS terminals

product/variant/attribute engine

SKU/barcode/GTIN

warehouse/bin/location

batch/serial

inventory ledger

reservations

suppliers

purchase orders

GRN

customers

carts

orders

order items

invoices

payments

refunds

returns

coupons/promotions

GST/HSN/SAC

shipping/packages

subscriptions

digital products

services

bundles/BOM

loyalty

customer credit/Khata

accounting journals

audit logs

offline sync/outbox

idempotency

webhook/event records


That schema should then be accompanied by the Prisma migrations, seed data, service-layer transaction rules, API contracts, and Next.js folder structure, so it is directly implementable rather than just an ER-model.




Plan 3


Below is the implementation blueprint I would use for the complete ecommerce + POS + billing + inventory foundation.

I’m preserving the important conventions from your earlier architecture: SQLite local/offline-first, Prisma, integer minor units for money, immutable inventory/financial ledgers, /api/v1 APIs, repositories/services between UI and Prisma, and an explicit sync/outbox boundary.


---

1. Final architecture

Next.js
│
├── UI / App Router
│
├── API /api/v1/*
│
└── Application Services
       │
       ├── Catalog
       ├── Pricing
       ├── Inventory
       ├── Purchasing
       ├── Sales
       ├── POS
       ├── Billing
       ├── Customers
       ├── Accounting
       ├── Fulfillment
       ├── Subscription
       └── Sync
              │
              ▼
       Repository Layer
              │
              ▼
          Prisma ORM
              │
              ▼
        Local SQLite
              │
       ┌──────┴──────┐
       │             │
    Outbox        Sync State
       │             │
       └──────┬──────┘
              ▼
       Cloud Sync API
              │
              ▼
      PostgreSQL / D1

The most important rule:

UI
 ↓
API / Server Action
 ↓
Application Service
 ↓
Repository
 ↓
Prisma
 ↓
SQLite

Never:

React component → Prisma


---

2. Monorepo / Next.js structure

I recommend:

commerce-platform/
│
├── apps/
│   └── web/
│       │
│       ├── src/
│       │   ├── app/
│       │   │   ├── (dashboard)/
│       │   │   │   ├── products/
│       │   │   │   ├── inventory/
│       │   │   │   ├── purchases/
│       │   │   │   ├── sales/
│       │   │   │   ├── invoices/
│       │   │   │   ├── customers/
│       │   │   │   ├── suppliers/
│       │   │   │   ├── accounting/
│       │   │   │   └── settings/
│       │   │   │
│       │   │   ├── pos/
│       │   │   │   ├── page.tsx
│       │   │   │   └── [terminalId]/
│       │   │   │
│       │   │   ├── shop/
│       │   │   │   ├── products/
│       │   │   │   ├── cart/
│       │   │   │   └── checkout/
│       │   │   │
│       │   │   └── api/
│       │   │       └── v1/
│       │   │
│       │   ├── modules/
│       │   │   ├── catalog/
│       │   │   ├── pricing/
│       │   │   ├── inventory/
│       │   │   ├── purchasing/
│       │   │   ├── sales/
│       │   │   ├── pos/
│       │   │   ├── billing/
│       │   │   ├── customers/
│       │   │   ├── accounting/
│       │   │   ├── fulfillment/
│       │   │   ├── subscriptions/
│       │   │   ├── marketplace/
│       │   │   └── sync/
│       │   │
│       │   ├── server/
│       │   │   ├── auth/
│       │   │   ├── permissions/
│       │   │   ├── transactions/
│       │   │   └── request-context/
│       │   │
│       │   ├── lib/
│       │   │   ├── prisma.ts
│       │   │   ├── money.ts
│       │   │   ├── dates.ts
│       │   │   └── ids.ts
│       │   │
│       │   └── components/
│       │
│       └── prisma/
│           ├── schema.prisma
│           ├── migrations/
│           └── seed.ts
│
├── packages/
│   ├── shared/
│   ├── validation/
│   ├── database/
│   ├── sync/
│   ├── accounting/
│   └── types/
│
├── scripts/
│   ├── migrate.ts
│   ├── seed.ts
│   └── verify-schema.ts
│
├── package.json
├── pnpm-workspace.yaml
└── turbo.json

For a single Next.js application you can omit apps/ and keep the same internal structure.


---

3. Module structure

Every business module should follow the same pattern:

modules/inventory/

├── domain/
│   ├── inventory.types.ts
│   ├── inventory.errors.ts
│   └── inventory.rules.ts
│
├── application/
│   ├── receive-stock.service.ts
│   ├── adjust-stock.service.ts
│   ├── reserve-stock.service.ts
│   ├── release-stock.service.ts
│   └── transfer-stock.service.ts
│
├── infrastructure/
│   ├── inventory.repository.ts
│   └── stock-ledger.repository.ts
│
├── schemas/
│   ├── receive-stock.schema.ts
│   └── adjustment.schema.ts
│
└── index.ts

This makes the business logic portable if you later move some services to Fastify/Deno/workers.


---

4. Prisma configuration

Use:

DATABASE_URL="file:./dev.db"

prisma/schema.prisma:

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

For money, use integer minor units:

₹499.00 → 49900 paise
₹1,250.50 → 125050 paise

Don't use JavaScript number for financial calculations.


---

5. Core Prisma schema

Rather than making every advanced module mandatory on day one, divide the schema into implementation layers.

Organization

model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique

  currency    String   @default("INR")
  countryCode String   @default("IN")
  timezone    String   @default("Asia/Kolkata")

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  stores      Store[]
  warehouses  Warehouse[]
  products    Product[]
  customers   Customer[]
  suppliers   Supplier[]
}


---

6. Product

enum ProductKind {
  PHYSICAL
  DIGITAL
  SERVICE
  SUBSCRIPTION
  BUNDLE
  COMPOSITE
}

enum ProductStatus {
  DRAFT
  ACTIVE
  INACTIVE
  ARCHIVED
}

enum VariantMode {
  SIMPLE
  VARIANT
  CONFIGURABLE
  BUNDLE
  COMPOSITE
}

model Product {
  id             String        @id @default(cuid())
  organizationId String

  name           String
  slug           String
  description    String?
  shortDescription String?

  kind           ProductKind   @default(PHYSICAL)
  variantMode    VariantMode   @default(SIMPLE)
  status         ProductStatus @default(DRAFT)

  categoryId     String?
  brandId        String?

  baseSku        String?

  trackInventory Boolean       @default(true)

  version        Int           @default(1)

  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  deletedAt      DateTime?

  organization   Organization  @relation(fields: [organizationId], references: [id])
  category       Category?     @relation(fields: [categoryId], references: [id])
  brand          Brand?        @relation(fields: [brandId], references: [id])

  variants       ProductVariant[]
  images         ProductImage[]

  @@unique([organizationId, slug])
  @@index([organizationId, status])
  @@index([categoryId])
}


---

7. Product variant

model ProductVariant {
  id              String        @id @default(cuid())
  organizationId  String
  productId       String

  sku             String

  name            String?

  mrpMinor        BigInt?
  costMinor       BigInt?
  priceMinor      BigInt?
  salePriceMinor  BigInt?

  taxRateBps      Int?

  weightGrams     Int?
  lengthMm        Int?
  widthMm         Int?
  heightMm        Int?

  trackInventory  Boolean       @default(true)
  allowBackorder  Boolean       @default(false)

  inventoryMode   InventoryMode @default(STOCK)

  reorderPoint    Int?
  reorderQuantity Int?

  status          ProductStatus @default(ACTIVE)

  version         Int           @default(1)

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?

  product         Product       @relation(fields: [productId], references: [id], onDelete: Cascade)

  barcodes        VariantBarcode[]
  attributes      VariantAttributeValue[]
  inventory       InventoryStock[]
  movements       StockMovement[]
  batches         InventoryBatch[]
  serialNumbers   SerialNumber[]
  priceRules      PriceRule[]

  @@unique([organizationId, sku])
  @@index([productId])
  @@index([organizationId, status])
}


---

8. Inventory mode

enum InventoryMode {
  NONE
  STOCK
  BATCH
  SERIAL
  BATCH_AND_SERIAL
}

Examples:

Digital product → NONE
T-shirt         → STOCK
Medicine        → BATCH
Laptop          → SERIAL
Special product → BATCH_AND_SERIAL


---

9. Variant attributes

enum AttributeType {
  TEXT
  NUMBER
  DECIMAL
  BOOLEAN
  SELECT
  MULTI_SELECT
  COLOR
  SIZE
}

model VariantAttribute {
  id             String   @id @default(cuid())
  organizationId String

  name           String
  code           String

  type           AttributeType

  isVariant      Boolean  @default(true)
  isRequired     Boolean  @default(false)
  isFilterable   Boolean  @default(true)

  sortOrder      Int      @default(0)

  values         VariantAttributeOption[]

  @@unique([organizationId, code])
}

model VariantAttributeOption {
  id          String   @id @default(cuid())
  attributeId String

  label       String
  value       String
  code        String?

  colorHex    String?
  imageUrl    String?

  sortOrder   Int      @default(0)

  attribute   VariantAttribute @relation(fields: [attributeId], references: [id], onDelete: Cascade)
  variants    VariantAttributeValue[]

  @@unique([attributeId, value])
}

model VariantAttributeValue {
  id        String @id @default(cuid())
  variantId String
  optionId  String

  variant   ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  option    VariantAttributeOption @relation(fields: [optionId], references: [id], onDelete: Cascade)

  @@unique([variantId, optionId])
}


---

10. Barcode

enum BarcodeType {
  EAN13
  EAN8
  UPC_A
  UPC_E
  CODE128
  CODE39
  ITF14
  GS1_128
  QR
  CUSTOM
}

model VariantBarcode {
  id         String      @id @default(cuid())
  variantId  String

  barcode    String
  normalized String

  type       BarcodeType
  isPrimary  Boolean     @default(false)
  isActive   Boolean     @default(true)

  createdAt  DateTime    @default(now())

  variant    ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)

  @@unique([normalized])
  @@index([variantId])
}

The POS lookup should use normalized, not whatever formatting the scanner happens to return.


---

11. Warehouse

model Store {
  id             String @id @default(cuid())
  organizationId String

  name           String
  code           String

  address        String?

  organization   Organization @relation(fields: [organizationId], references: [id])
  terminals      POSTerminal[]

  @@unique([organizationId, code])
}

model Warehouse {
  id             String @id @default(cuid())
  organizationId String

  name           String
  code           String

  organization   Organization @relation(fields: [organizationId], references: [id])
  locations      InventoryLocation[]

  @@unique([organizationId, code])
}

model InventoryLocation {
  id          String @id @default(cuid())
  warehouseId String

  name        String
  code        String

  warehouse   Warehouse @relation(fields: [warehouseId], references: [id], onDelete: Cascade)

  stock       InventoryStock[]

  @@unique([warehouseId, code])
}


---

12. Inventory stock

model InventoryStock {
  id           String @id @default(cuid())

  variantId    String
  warehouseId  String
  locationId   String?

  onHand       Int @default(0)
  reserved     Int @default(0)
  damaged      Int @default(0)
  incoming     Int @default(0)

  version      Int @default(1)

  updatedAt    DateTime @updatedAt

  variant      ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  location     InventoryLocation? @relation(fields: [locationId], references: [id])

  @@unique([variantId, warehouseId, locationId])
  @@index([variantId])
}

Available:

const available =
  onHand -
  reserved -
  damaged;

Never let the frontend send available.


---

13. Stock movement

enum StockMovementType {
  OPENING
  PURCHASE
  SALE
  SALE_RETURN
  PURCHASE_RETURN
  TRANSFER_IN
  TRANSFER_OUT
  ADJUSTMENT_IN
  ADJUSTMENT_OUT
  DAMAGE
  EXPIRED
  STOCK_COUNT
  RESERVATION
  RELEASE
}

model StockMovement {
  id             String @id @default(cuid())

  organizationId String
  variantId      String

  warehouseId    String?
  locationId     String?

  type           StockMovementType

  quantity       Int

  balanceBefore  Int
  balanceAfter   Int

  referenceType  String?
  referenceId    String?

  idempotencyKey String?

  reason         String?

  createdAt      DateTime @default(now())

  variant        ProductVariant @relation(fields: [variantId], references: [id])

  @@unique([organizationId, idempotencyKey])
  @@index([variantId, createdAt])
  @@index([referenceId])
}

This is your inventory audit trail.


---

14. Batch

model InventoryBatch {
  id              String @id @default(cuid())

  variantId       String

  batchNumber     String

  manufactureDate DateTime?
  expiryDate      DateTime?

  quantity        Int @default(0)
  reserved        Int @default(0)

  costMinor       BigInt?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  variant         ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)

  @@unique([variantId, batchNumber])
  @@index([expiryDate])
}


---

15. Serial number

enum SerialStatus {
  AVAILABLE
  RESERVED
  SOLD
  RETURNED
  DAMAGED
  REPAIR
  SCRAPPED
}

model SerialNumber {
  id          String @id @default(cuid())

  variantId   String

  serial      String
  status      SerialStatus @default(AVAILABLE)

  warrantyEnd DateTime?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  variant     ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)

  @@unique([serial])
  @@index([variantId, status])
}


---

16. Customer

model Customer {
  id             String @id @default(cuid())
  organizationId String

  name           String
  phone          String?
  email          String?

  gstin          String?

  creditLimitMinor BigInt @default(0)
  creditBalanceMinor BigInt @default(0)

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id])

  orders         Order[]
  invoices       Invoice[]
  payments       Payment[]

  @@index([organizationId])
  @@index([phone])
  @@index([email])
}


---

17. Orders

enum OrderChannel {
  POS
  ONLINE
  MARKETPLACE
  MOBILE
  API
  MANUAL
  SUBSCRIPTION
}

enum OrderStatus {
  DRAFT
  PENDING_PAYMENT
  PAID
  CONFIRMED
  PROCESSING
  PARTIALLY_SHIPPED
  SHIPPED
  DELIVERED
  CANCELLED
  COMPLETED
  RETURNED
}

model Order {
  id             String @id @default(cuid())

  organizationId String
  customerId     String?

  orderNumber    String

  channel        OrderChannel
  status         OrderStatus @default(DRAFT)

  subtotalMinor  BigInt
  discountMinor  BigInt @default(0)
  taxMinor       BigInt @default(0)
  shippingMinor  BigInt @default(0)
  grandTotalMinor BigInt

  currency       String @default("INR")

  idempotencyKey String?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  customer       Customer? @relation(fields: [customerId], references: [id])

  items          OrderItem[]
  payments       Payment[]
  invoices       Invoice[]

  @@unique([organizationId, orderNumber])
  @@unique([organizationId, idempotencyKey])
  @@index([customerId])
  @@index([organizationId, createdAt])
}


---

18. Order item

model OrderItem {
  id              String @id @default(cuid())

  orderId         String
  variantId       String

  productName     String
  variantName     String?
  sku             String

  quantity        Int

  unitPriceMinor  BigInt
  discountMinor   BigInt @default(0)
  taxMinor        BigInt @default(0)

  totalMinor      BigInt

  order           Order @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@index([variantId])
}

Notice that we snapshot:

productName
variantName
sku
unitPrice
tax

inside the order item.

Historical invoices must not change because someone later renamed a product.


---

19. Invoice

enum InvoiceStatus {
  DRAFT
  FINALIZED
  VOID
  REFUNDED
}

model Invoice {
  id              String @id @default(cuid())

  organizationId  String
  orderId         String
  customerId      String?

  invoiceNumber   String

  status          InvoiceStatus @default(DRAFT)

  subtotalMinor   BigInt
  discountMinor   BigInt
  taxMinor        BigInt
  totalMinor      BigInt

  paidMinor       BigInt @default(0)
  balanceMinor    BigInt @default(0)

  finalizedAt     DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  order           Order @relation(fields: [orderId], references: [id])
  customer        Customer? @relation(fields: [customerId], references: [id])
  payments        Payment[]

  @@unique([organizationId, invoiceNumber])
  @@index([orderId])
}


---

20. Payment

enum PaymentMethod {
  CASH
  CARD
  UPI
  BANK_TRANSFER
  WALLET
  CREDIT
  GATEWAY
  OTHER
}

enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
  REFUNDED
  PARTIAL_REFUND
}

model Payment {
  id             String @id @default(cuid())

  organizationId String
  orderId        String?
  invoiceId      String?
  customerId     String?

  amountMinor    BigInt

  method         PaymentMethod
  status         PaymentStatus @default(PENDING)

  reference      String?

  idempotencyKey String?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  order          Order? @relation(fields: [orderId], references: [id])
  invoice        Invoice? @relation(fields: [invoiceId], references: [id])
  customer       Customer? @relation(fields: [customerId], references: [id])

  @@unique([organizationId, idempotencyKey])
  @@index([reference])
}

This supports split payments naturally.


---

21. POS

model POSTerminal {
  id        String @id @default(cuid())

  storeId   String
  name      String
  code      String

  isActive  Boolean @default(true)

  store     Store @relation(fields: [storeId], references: [id])

  sessions  POSSession[]

  @@unique([storeId, code])
}

model POSSession {
  id             String @id @default(cuid())

  terminalId     String

  openedAt       DateTime @default(now())
  closedAt       DateTime?

  openingCashMinor BigInt
  closingCashMinor BigInt?

  status         String @default("OPEN")

  terminal       POSTerminal @relation(fields: [terminalId], references: [id])

  @@index([terminalId, status])
}


---

22. Purchase architecture

Supplier
 ↓
Purchase Order
 ↓
Goods Receipt
 ↓
Stock Increase
 ↓
Supplier Invoice
 ↓
Payable
 ↓
Supplier Payment

Core:

model Supplier {
  id             String @id @default(cuid())
  organizationId String

  name           String
  phone          String?
  email          String?
  gstin          String?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id])

  @@index([organizationId])
}

model PurchaseOrder {
  id             String @id @default(cuid())

  organizationId String
  supplierId     String

  poNumber       String

  status         String @default("DRAFT")

  subtotalMinor  BigInt
  taxMinor       BigInt @default(0)
  totalMinor     BigInt

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([organizationId, poNumber])
}


---

23. Accounting foundation

Use double-entry.

model Account {
  id             String @id @default(cuid())
  organizationId String

  code           String
  name           String

  type           String

  isSystem       Boolean @default(false)

  @@unique([organizationId, code])
}

model JournalEntry {
  id             String @id @default(cuid())

  organizationId String

  entryNumber    String

  referenceType  String?
  referenceId    String?

  entryDate      DateTime

  description    String?

  createdAt      DateTime @default(now())

  lines          JournalLine[]

  @@unique([organizationId, entryNumber])
  @@index([referenceId])
}

model JournalLine {
  id          String @id @default(cuid())

  journalId   String
  accountId   String

  debitMinor  BigInt @default(0)
  creditMinor BigInt @default(0)

  description String?

  journal     JournalEntry @relation(fields: [journalId], references: [id], onDelete: Cascade)
  account     Account @relation(fields: [accountId], references: [id])

  @@index([journalId])
  @@index([accountId])
}

Rule:

SUM(debit) === SUM(credit)

Always.


---

24. Sync/outbox

For offline-first operation:

model SyncOutbox {
  id             String @id @default(cuid())

  organizationId String
  deviceId       String

  eventType      String
  entityType     String
  entityId       String

  payload        String

  status         String @default("PENDING")

  attempts       Int @default(0)

  lastError      String?

  createdAt      DateTime @default(now())
  syncedAt       DateTime?

  @@index([deviceId, status])
  @@index([organizationId, createdAt])
}

model SyncState {
  id             String @id @default(cuid())

  organizationId String
  deviceId       String

  cursor         String?

  lastPulledAt   DateTime?
  lastPushedAt   DateTime?

  updatedAt      DateTime @updatedAt

  @@unique([organizationId, deviceId])
}


---

25. Audit log

model AuditLog {
  id             String @id @default(cuid())

  organizationId String

  actorId        String?
  deviceId       String?

  action         String
  entityType     String
  entityId       String

  beforeJson     String?
  afterJson      String?

  reason         String?

  createdAt      DateTime @default(now())

  @@index([organizationId, createdAt])
  @@index([entityType, entityId])
}


---

26. Prisma migration workflow

Development:

pnpm prisma migrate dev --name init_commerce_core

Then:

pnpm prisma generate

Seed:

pnpm prisma db seed

Production/local deployment:

pnpm prisma migrate deploy

Never use:

prisma db push

as your production schema migration mechanism.


---

27. Migration naming strategy

Don't make one giant migration forever.

Use:

migrations/

20261007100000_core/
20261007103000_catalog/
20261007110000_inventory/
20261007113000_customers/
20261007120000_sales/
20261007123000_billing/
20261007130000_pos/
20261007133000_purchasing/
20261007140000_accounting/
20261007143000_sync/

In real development, Prisma generates the timestamped directories.

Recommended logical progression:

001_core
002_catalog
003_inventory
004_customers
005_purchasing
006_sales
007_billing
008_pos
009_accounting
010_sync


---

28. Migration safety rules

Never

DROP TABLE production_table

without a deliberate migration plan.

Never

rename a financial field directly

Instead:

add new field
↓
backfill
↓
deploy application
↓
verify
↓
remove old field later

Financial records

Never physically delete:

Invoice
Payment
JournalEntry
StockMovement

Use:

VOID
REVERSAL
REFUND
ADJUSTMENT


---

29. Seed architecture

Create:

prisma/
├── seed.ts
└── seed/
    ├── organization.ts
    ├── roles.ts
    ├── units.ts
    ├── tax.ts
    ├── attributes.ts
    ├── categories.ts
    ├── products.ts
    ├── warehouses.ts
    └── accounting.ts

package.json:

{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}


---

30. Seed order

Never seed randomly.

Use:

1. Organization
2. User/Roles
3. Store
4. Warehouse
5. Locations
6. Categories
7. Brands
8. Attributes
9. Attribute options
10. Tax configuration
11. Products
12. Variants
13. Barcodes
14. Inventory
15. Customers
16. Suppliers
17. Accounting accounts
18. POS terminal


---

31. Example seed

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const organization =
    await prisma.organization.upsert({
      where: {
        slug: "demo-store",
      },
      update: {},
      create: {
        name: "Demo Store",
        slug: "demo-store",
        currency: "INR",
        countryCode: "IN",
        timezone: "Asia/Kolkata",
      },
    });

  const store =
    await prisma.store.create({
      data: {
        organizationId: organization.id,
        name: "Main Store",
        code: "MAIN",
      },
    });

  const warehouse =
    await prisma.warehouse.create({
      data: {
        organizationId: organization.id,
        name: "Main Warehouse",
        code: "WH-MAIN",
      },
    });

  const location =
    await prisma.inventoryLocation.create({
      data: {
        warehouseId: warehouse.id,
        name: "Main Bin",
        code: "BIN-01",
      },
    });

  console.log({
    organization: organization.id,
    store: store.id,
    warehouse: warehouse.id,
    location: location.id,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());


---

32. Seed realistic variant data

Create:

Product:
Premium T-Shirt

Attributes:

Color
 ├── Black
 ├── Red
 └── Blue

Size
 ├── S
 ├── M
 ├── L
 └── XL

Generate:

TSH-BLK-S
TSH-BLK-M
TSH-BLK-L
TSH-BLK-XL

TSH-RED-S
TSH-RED-M
TSH-RED-L
TSH-RED-XL

TSH-BLU-S
TSH-BLU-M
TSH-BLU-L
TSH-BLU-XL

Each gets:

SKU
Barcode
Price
Cost
Opening Stock


---

33. Service-layer rules

This is more important than the Prisma schema.

Product creation

Request
 ↓
Zod validation
 ↓
Normalize
 ↓
Business validation
 ↓
Prisma transaction
 ↓
Create Product
 ↓
Create Variant(s)
 ↓
Create Barcode(s)
 ↓
Create Images
 ↓
Create Audit
 ↓
Create Outbox
 ↓
Commit


---

34. Quick product creation transaction

For POS:

await prisma.$transaction(async (tx) => {
  const product = await createProduct(tx, input);

  const variant = await createVariant(tx, {
    productId: product.id,
    sku: input.sku,
  });

  await createBarcode(tx, {
    variantId: variant.id,
    barcode: input.barcode,
  });

  await createOpeningStock(tx, {
    variantId: variant.id,
    warehouseId: input.warehouseId,
    quantity: input.quantity,
  });

  await createStockMovement(tx, {
    variantId: variant.id,
    type: "OPENING",
    quantity: input.quantity,
  });

  await createAuditLog(tx, ...);

  await createOutboxEvent(tx, ...);
});

This preserves the earlier requirement that quick product creation be atomic: product + variant + barcode + inventory + opening stock transaction.


---

35. Inventory transaction rules

Receive stock

Validate SKU
 ↓
Validate warehouse
 ↓
Validate quantity > 0
 ↓
Create/update batch if required
 ↓
Read current stock
 ↓
Increase onHand
 ↓
Create StockMovement
 ↓
Create AuditLog
 ↓
Create Outbox

All inside one database transaction.


---

36. Sell stock

Resolve SKU
 ↓
Check active variant
 ↓
Check inventory mode
 ↓
Calculate available
 ↓
Check reservation
 ↓
Check backorder
 ↓
Create order
 ↓
Create order items
 ↓
Create stock movement
 ↓
Update stock snapshot
 ↓
Create invoice
 ↓
Create payment
 ↓
Create accounting journal
 ↓
Audit
 ↓
Outbox


---

37. Important correction: reserve vs deduct

For ecommerce:

Cart
 ↓
Reserve
 ↓
Payment
 ↓
Fulfillment
 ↓
Deduct

For a completed POS sale:

Sale
 ↓
Deduct immediately

Don't use the same inventory transition blindly for both.


---

38. Reservation rules

available =
onHand - reserved - damaged

When reserving:

reserved += quantity

When releasing:

reserved -= quantity

When fulfilling:

reserved -= quantity
onHand -= quantity

This prevents double deduction.


---

39. Stock adjustment rules

Never:

stock.quantity = 75;

Instead:

Current = 100
Counted = 75

Adjustment = -25

Create:

ADJUSTMENT_OUT -25

Then:

100 → 75

This gives you an audit trail.


---

40. Return rules

Customer return:

Return approved
 ↓
Receive product
 ↓
Inspect

If good:

onHand += quantity

If damaged:

damaged += quantity

If scrap:

write-off

Never automatically restock every return.


---

41. Purchase rules

Purchase Order:

NO stock change

Goods Receipt:

YES stock change

Purchase Invoice:

Accounting change

Supplier Payment:

Cash/Bank + payable change

This separation is critical.


---

42. Invoice finalization rule

Draft invoice:

editable

Finalized invoice:

immutable

Correction:

VOID
+
replacement invoice

Never silently mutate a finalized financial document.


---

43. Payment rules

Payment lifecycle:

PENDING
 ↓
SUCCESS

or:

PENDING
 ↓
FAILED

Refund:

SUCCESS
 ↓
PARTIAL_REFUND
 ↓
REFUNDED

Never overwrite the original payment amount.

Create refund records.


---

44. Accounting transaction rule

Every journal must balance.

const debit = lines.reduce(
  (sum, line) => sum + line.debitMinor,
  0n
);

const credit = lines.reduce(
  (sum, line) => sum + line.creditMinor,
  0n
);

if (debit !== credit) {
  throw new Error("UNBALANCED_JOURNAL");
}


---

45. API contract standard

All APIs:

/api/v1/*

Response:

{
  "success": true,
  "data": {},
  "meta": {}
}

Error:

{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Insufficient available stock",
    "details": {}
  }
}


---

46. Product API

Create

POST /api/v1/products

Request:

{
  "name": "Premium T-Shirt",
  "slug": "premium-t-shirt",
  "kind": "PHYSICAL",
  "variantMode": "VARIANT",
  "categoryId": "cat_123",
  "brandId": "brand_123"
}

Response:

{
  "success": true,
  "data": {
    "id": "prod_123",
    "name": "Premium T-Shirt",
    "status": "DRAFT"
  }
}


---

47. Generate variants

POST /api/v1/products/:productId/variants/generate

Request:

{
  "attributes": [
    {
      "attributeId": "color",
      "optionIds": [
        "black",
        "red"
      ]
    },
    {
      "attributeId": "size",
      "optionIds": [
        "s",
        "m",
        "l"
      ]
    }
  ]
}

Response:

{
  "success": true,
  "data": {
    "generated": 6,
    "variants": [
      {
        "sku": "TSH-BLK-S",
        "attributes": {
          "Color": "Black",
          "Size": "S"
        }
      }
    ]
  }
}


---

48. Barcode lookup

This endpoint must be extremely fast:

GET /api/v1/barcodes/:barcode

Response:

{
  "success": true,
  "data": {
    "variantId": "var_123",
    "sku": "TSH-BLK-M",
    "productName": "Premium T-Shirt",
    "variantName": "Black / Medium",
    "priceMinor": 49900,
    "available": 42
  }
}

This is the primary POS lookup path.


---

49. Inventory API

GET  /api/v1/inventory
GET  /api/v1/inventory/:variantId
POST /api/v1/inventory/receive
POST /api/v1/inventory/adjust
POST /api/v1/inventory/transfer
POST /api/v1/inventory/reserve
POST /api/v1/inventory/release
GET  /api/v1/inventory/movements


---

50. Receive inventory

POST /api/v1/inventory/receive
Idempotency-Key: GRN-001-ITEM-001

{
  "variantId": "var_123",
  "warehouseId": "wh_001",
  "locationId": "bin_001",
  "quantity": 100,
  "batch": {
    "batchNumber": "BATCH-001",
    "expiryDate": "2027-10-01"
  },
  "costMinor": 2500,
  "reference": {
    "type": "GOODS_RECEIPT",
    "id": "grn_001"
  }
}


---

51. Stock adjustment

POST /api/v1/inventory/adjust

{
  "variantId": "var_123",
  "warehouseId": "wh_001",
  "locationId": "bin_001",
  "countedQuantity": 75,
  "reason": "STOCK_COUNT"
}

Backend calculates:

Current = 100
Counted = 75

Adjustment = -25

Never accept arbitrary balanceAfter from the client.


---

52. POS checkout API

POST /api/v1/pos/sales
Idempotency-Key: POS-DEVICE-01-SESSION-22-TXN-00421

{
  "terminalId": "terminal_01",
  "sessionId": "session_22",

  "customerId": "customer_01",

  "items": [
    {
      "variantId": "var_123",
      "quantity": 2
    }
  ],

  "payments": [
    {
      "method": "CASH",
      "amountMinor": 50000
    },
    {
      "method": "UPI",
      "amountMinor": 49800
    }
  ]
}

The server calculates:

price
discount
tax
total
inventory
payment balance

Never trust calculated totals from the client.


---

53. Ecommerce checkout

POST /api/v1/orders

{
  "channel": "ONLINE",
  "customerId": "cus_001",

  "items": [
    {
      "variantId": "var_001",
      "quantity": 2
    }
  ],

  "shippingAddress": {
    "name": "Customer",
    "line1": "Address",
    "city": "Pune",
    "state": "Maharashtra",
    "postalCode": "411001",
    "country": "IN"
  }
}

Server:

resolve products
↓
resolve prices
↓
resolve tax
↓
validate stock
↓
reserve stock
↓
create order


---

54. Payment API

POST /api/v1/payments

{
  "orderId": "order_123",
  "invoiceId": "invoice_123",
  "amountMinor": 149900,
  "method": "UPI",
  "gateway": "RAZORPAY",
  "idempotencyKey": "pay_abc"
}


---

55. Invoice API

POST /api/v1/invoices
POST /api/v1/invoices/:id/finalize
GET  /api/v1/invoices/:id
POST /api/v1/invoices/:id/void

Finalization should run:

validate totals
↓
assign invoice number
↓
freeze snapshot
↓
create accounting journal
↓
audit


---

56. Purchase API

POST /api/v1/purchases/orders
GET  /api/v1/purchases/orders
POST /api/v1/purchases/orders/:id/receive
POST /api/v1/purchases/returns


---

57. Customer credit API

GET  /api/v1/customers/:id/ledger
POST /api/v1/customers/:id/credit
POST /api/v1/customers/:id/payment
GET  /api/v1/customers/:id/balance

Example:

{
  "amountMinor": 500000,
  "reason": "SALE_ON_CREDIT"
}


---

58. Sync API

This should remain a separate boundary.

Push

POST /api/v1/sync/push

{
  "deviceId": "device_001",
  "events": [
    {
      "eventId": "evt_001",
      "type": "SALE_CREATED",
      "entityType": "ORDER",
      "entityId": "order_123",
      "version": 1,
      "payload": {}
    }
  ]
}

Pull

GET /api/v1/sync/pull?cursor=abc

Status

GET /api/v1/sync/status

This follows the earlier sync boundary you established around local SQLite and cloud persistence.


---

59. Sync conflict rules

Not everything should use last-write-wins.

Product description

LWW acceptable

Inventory

DO NOT use LWW

Invoice

immutable

Payment

immutable/event based

Stock movement

append only

Customer phone

LWW or explicit conflict

Product price

version validation

This distinction will prevent serious inventory corruption.


---

60. Idempotency implementation

Create a generic table:

model IdempotencyRecord {
  id             String @id @default(cuid())

  organizationId String
  key            String

  endpoint       String

  requestHash    String

  responseJson   String?
  statusCode     Int?

  createdAt      DateTime @default(now())
  expiresAt      DateTime?

  @@unique([organizationId, key])
}

Service:

async function idempotent(
  key: string,
  handler: () => Promise<Result>
) {
  const existing = await findIdempotency(key);

  if (existing) {
    return existing.response;
  }

  const result = await handler();

  await saveIdempotency(key, result);

  return result;
}

For financial operations, the idempotency record and business mutation should be in the same transaction where possible.


---

61. Repository pattern

Example:

export interface InventoryRepository {
  getStock(
    variantId: string,
    warehouseId: string
  ): Promise<InventoryStock | null>;

  increaseStock(
    variantId: string,
    warehouseId: string,
    quantity: number
  ): Promise<void>;

  decreaseStock(
    variantId: string,
    warehouseId: string,
    quantity: number
  ): Promise<void>;
}

Prisma implementation:

export class PrismaInventoryRepository
  implements InventoryRepository {

  constructor(private readonly db: PrismaClient) {}

  async getStock(variantId: string, warehouseId: string) {
    return this.db.inventoryStock.findFirst({
      where: {
        variantId,
        warehouseId
      }
    });
  }
}


---

62. Service layer

Example:

export class ReceiveStockService {
  constructor(
    private readonly db: PrismaClient
  ) {}

  async execute(input: ReceiveStockInput) {

    return this.db.$transaction(async tx => {

      const variant =
        await tx.productVariant.findUnique({
          where: {
            id: input.variantId
          }
        });

      if (!variant) {
        throw new Error("VARIANT_NOT_FOUND");
      }

      if (!variant.trackInventory) {
        throw new Error("INVENTORY_NOT_TRACKED");
      }

      const stock =
        await tx.inventoryStock.findFirst({
          where: {
            variantId: input.variantId,
            warehouseId: input.warehouseId,
            locationId: input.locationId
          }
        });

      if (!stock) {
        throw new Error("STOCK_LOCATION_NOT_FOUND");
      }

      const before = stock.onHand;
      const after = before + input.quantity;

      await tx.inventoryStock.update({
        where: {
          id: stock.id
        },
        data: {
          onHand: after,
          version: {
            increment: 1
          }
        }
      });

      await tx.stockMovement.create({
        data: {
          organizationId: input.organizationId,
          variantId: input.variantId,
          warehouseId: input.warehouseId,
          locationId: input.locationId,
          type: "PURCHASE",
          quantity: input.quantity,
          balanceBefore: before,
          balanceAfter: after,
          referenceType: "GOODS_RECEIPT",
          referenceId: input.referenceId,
          idempotencyKey: input.idempotencyKey
        }
      });

      return {
        before,
        after
      };
    });
  }
}


---

63. Validation layer

Use Zod before services:

import { z } from "zod";

export const ReceiveStockSchema = z.object({
  organizationId: z.string(),
  variantId: z.string(),
  warehouseId: z.string(),
  locationId: z.string().optional(),

  quantity: z.number().int().positive(),

  referenceId: z.string().optional(),

  idempotencyKey: z.string().min(8)
});

Pipeline:

HTTP request
 ↓
Zod
 ↓
Authentication
 ↓
Authorization
 ↓
Service
 ↓
Repository
 ↓
Prisma


---

64. API route structure

Example:

src/app/api/v1/inventory/receive/route.ts

export async function POST(request: Request) {

  const body = await request.json();

  const input =
    ReceiveStockSchema.parse(body);

  const service =
    new ReceiveStockService(prisma);

  const result =
    await service.execute(input);

  return Response.json({
    success: true,
    data: result
  });
}

The route should remain thin.


---

65. POS service orchestration

The POS sale is the most important transaction.

POST /pos/sales
        │
        ▼
POSSaleService
        │
        ├── Validate terminal/session
        ├── Validate items
        ├── Resolve prices
        ├── Calculate discounts
        ├── Calculate GST
        ├── Validate inventory
        ├── Create order
        ├── Create order items
        ├── Deduct inventory
        ├── Create invoice
        ├── Create payments
        ├── Create accounting journal
        ├── Create audit
        └── Create outbox events

One $transaction.


---

66. Accounting generated by POS

For:

Sale = ₹1,180
GST = ₹180
COGS = ₹600

create:

Journal Entry 1

DR Cash              ₹1,180
   CR Sales          ₹1,000
   CR GST Payable      ₹180

Then:

Journal Entry 2

DR COGS                ₹600
   CR Inventory        ₹600

Both must be atomic with the sale.


---

67. Database transaction boundaries

Use one transaction for:

Product creation

Product
Variant
Barcode
Opening Stock
Ledger
Audit
Outbox

POS sale

Order
Items
Inventory
Invoice
Payment
Accounting
Audit
Outbox

Purchase receipt

Goods Receipt
Inventory
Stock Ledger
Supplier payable
Accounting
Audit
Outbox

Return

Return
Inspection
Inventory
Refund
Accounting
Audit
Outbox


---

68. Don't put everything into one transaction

Avoid:

POS sale
+
send email
+
call Razorpay
+
upload PDF
+
send WhatsApp
+
Typesense indexing

inside one database transaction.

Instead:

DATABASE TRANSACTION
       │
       ├── Sale
       ├── Inventory
       ├── Invoice
       ├── Payment state
       ├── Accounting
       └── Outbox
              │
              ▼
        Background jobs
              │
       ┌──────┼───────┐
       ▼      ▼       ▼
    Email   Search   Webhook

This is where your BullMQ/Inngest architecture fits naturally.


---

69. Event processing

Example:

SALE_COMPLETED

creates:

SEARCH_INDEX_ORDER
GENERATE_INVOICE_PDF
SEND_RECEIPT
SEND_WEBHOOK
UPDATE_ANALYTICS
SYNC_CLOUD

These should be asynchronous.


---

70. Next.js server/client boundary

Server

Prisma
Services
Repositories
Secrets
Payment providers
Accounting
Inventory mutations

Client

Forms
Tables
POS UI
Barcode scanner
Cart UI
Charts
Filters

Never expose Prisma or database credentials to client components.


---

71. POS UI architecture

app/pos/[terminalId]/

page.tsx
│
├── POSShell
│
├── BarcodeScanner
│
├── ProductSearch
│
├── Cart
│   ├── CartItem
│   ├── QuantityControl
│   └── DiscountEditor
│
├── CustomerSelector
│
├── PaymentPanel
│   ├── CashPayment
│   ├── UPIPayment
│   ├── CardPayment
│   └── SplitPayment
│
├── ReceiptPreview
│
└── SessionStatus


---

72. Product management UI

products/
├── page.tsx
├── new/
│   └── page.tsx
├── [id]/
│   ├── page.tsx
│   ├── edit/
│   ├── variants/
│   ├── inventory/
│   ├── pricing/
│   └── history/

Tabs:

General
Variants
Pricing
Inventory
Images
SEO
Channels
History


---

73. Inventory UI

inventory/
├── page.tsx
├── stock/
├── movements/
├── transfers/
├── adjustments/
├── batches/
├── serials/
├── counts/
├── low-stock/
└── valuation/


---

74. Purchase UI

purchases/
├── page.tsx
├── new/
├── [id]/
├── receive/
├── returns/
└── suppliers/


---

75. Sales UI

sales/
├── orders/
├── invoices/
├── payments/
├── returns/
├── refunds/
└── quotes/


---

76. Prisma seed test data

You should have at least:

1 organization
2 stores
2 warehouses
10 bins
5 categories
5 brands
10 customers
5 suppliers

20 products

Product types:
├── simple
├── variant
├── batch
├── serial
├── bundle
├── service
├── digital
└── subscription

100 variants
200 barcodes

Opening stock

10 purchase orders
10 sales
5 invoices
10 payments

Accounting chart
Journal entries

POS terminal
POS session

This makes local development much more realistic.


---

77. Automated test matrix

Before calling the foundation production-ready:

Product

✓ create
✓ update
✓ archive
✓ duplicate SKU rejection
✓ duplicate barcode rejection

Variant

✓ generate 1D
✓ generate 2D
✓ generate 3D
✓ exclude combinations
✓ duplicate combination rejection

Inventory

✓ receive
✓ sell
✓ reserve
✓ release
✓ transfer
✓ adjustment
✓ batch
✓ expiry
✓ serial

POS

✓ cash
✓ UPI
✓ card
✓ split payment
✓ refund
✓ offline
✓ duplicate request

Billing

✓ invoice
✓ GST
✓ finalization
✓ void
✓ refund

Accounting

✓ balanced journal
✓ COGS
✓ inventory
✓ receivable
✓ payable


---

78. Critical concurrency test

You need a test where:

Stock = 1

Two devices simultaneously attempt:

Device A → Buy 1
Device B → Buy 1

Expected:

A → SUCCESS
B → INSUFFICIENT_STOCK

Never:

A → SUCCESS
B → SUCCESS
Stock → -1

This is one of the most important tests in the entire platform.


---

79. Offline conflict example

Device A offline:

Stock snapshot = 10

Device B online:

Sells 8
Cloud stock = 2

Device A attempts:

Sell 5

The sync layer must not blindly overwrite cloud stock with 5 remaining.

Instead it submits a business event:

SALE_CREATED
quantity = 5

Cloud evaluates the current inventory state.

Result:

available = 2
requested = 5

→ conflict / insufficient stock

This is why inventory synchronization must be event/operation based, not simple row replication.


---

80. Recommended API error codes

Standardize these:

AUTH_REQUIRED
FORBIDDEN

PRODUCT_NOT_FOUND
VARIANT_NOT_FOUND
SKU_ALREADY_EXISTS
BARCODE_ALREADY_EXISTS

INVALID_VARIANT_COMBINATION

WAREHOUSE_NOT_FOUND
LOCATION_NOT_FOUND

INSUFFICIENT_STOCK
STOCK_NOT_TRACKED
INVALID_STOCK_ADJUSTMENT

ORDER_NOT_FOUND
ORDER_ALREADY_COMPLETED
ORDER_ALREADY_CANCELLED

PAYMENT_FAILED
PAYMENT_ALREADY_PROCESSED
PAYMENT_AMOUNT_MISMATCH

INVOICE_NOT_FOUND
INVOICE_ALREADY_FINALIZED
INVOICE_ALREADY_VOID

RETURN_NOT_ALLOWED
REFUND_NOT_ALLOWED

UNBALANCED_JOURNAL

IDEMPOTENCY_CONFLICT
SYNC_CONFLICT
VERSION_CONFLICT


---

81. Versioning

Every mutable important entity should have:

version

Example:

Product version = 4

Client sends:

{
  "version": 4,
  "name": "Updated Product"
}

Server:

Current = 5
Request = 4

→ VERSION_CONFLICT

This prevents offline clients from silently overwriting newer data.


---

82. Soft deletion

Use:

deletedAt

for:

Product
Variant
Customer
Supplier
Category
Brand

Don't physically delete records with business history.

For:

StockMovement
Invoice
Payment
JournalEntry

don't use normal deletion at all.


---

83. Money helper

Create:

export function rupeesToMinor(value: string): bigint {
  const [rupees, paise = ""] = value.split(".");

  return (
    BigInt(rupees) * 100n +
    BigInt((paise + "00").slice(0, 2))
  );
}

export function minorToRupees(
  value: bigint
): string {
  const rupees = value / 100n;
  const paise = value % 100n;

  return `${rupees}.${paise
    .toString()
    .padStart(2, "0")}`;
}

Don't use:

499.99 * 100

for financial correctness.


---

84. Recommended implementation sequence

Do not implement all modules simultaneously.

Sprint 1

Prisma
SQLite
Organization
Store
Warehouse
RBAC

Sprint 2

Product
Category
Brand
Attributes
Variants
SKU
Barcode

Sprint 3

Inventory
Warehouse
Bin
Stock
Ledger
Adjustment
Transfer

Sprint 4

Customers
Cart
Order
Order Items
Reservations

Sprint 5

POS
Terminal
Session
Cash drawer
Barcode scanning
Split payment

Sprint 6

Invoice
GST
Payment
Refund
Returns

Sprint 7

Purchasing
Supplier
PO
GRN
Purchase return

Sprint 8

Accounting
Chart of accounts
Journal
COGS
Receivable
Payable

Sprint 9

Offline
Outbox
Sync
Conflict resolution
Idempotency

Sprint 10

Ecommerce
Shipping
Coupons
Promotions
Subscriptions
Digital
Services
Bundles


---

85. Final implementation rulebook

If you want this platform to remain maintainable as it grows, these should be non-negotiable engineering rules:

1. Product ≠ Variant ≠ Inventory
2. SKU identifies a sellable variant
3. Barcode resolves to SKU
4. Inventory belongs to SKU
5. StockMovement is immutable
6. InventoryStock is a materialized snapshot
7. Orders snapshot product/price/tax information
8. Finalized invoices are immutable
9. Payments are immutable events
10. Refunds create new records
11. Accounting is double-entry
12. Every journal balances
13. Financial mutations are transactional
14. Important POST operations are idempotent
15. Inventory never uses last-write-wins
16. Offline sync sends business operations/events
17. UI never directly accesses Prisma
18. API validates with Zod
19. Business rules live in services/domain
20. Prisma is behind repositories
21. External APIs are never called inside DB transactions
22. External work happens through outbox/jobs
23. Products with history are archived, not deleted
24. Money uses integer minor units
25. Historical documents use snapshots
26. Stock adjustments require reasons
27. POS and ecommerce share the same commerce core
28. Bundles and BOMs are different concepts
29. Batch and serial tracking are SKU-level behaviors
30. Every tenant-owned entity is scoped to organization

The resulting transaction architecture

┌──────────────┐
                   │    CLIENT    │
                   └──────┬───────┘
                          │
                    /api/v1
                          │
                   ┌──────▼───────┐
                   │    ZOD       │
                   │  VALIDATION  │
                   └──────┬───────┘
                          │
                   ┌──────▼───────┐
                   │ APPLICATION   │
                   │   SERVICE     │
                   └──────┬───────┘
                          │
                   ┌──────▼───────┐
                   │ REPOSITORIES  │
                   └──────┬───────┘
                          │
                   ┌──────▼───────┐
                   │   PRISMA      │
                   │ TRANSACTION   │
                   └──────┬───────┘
                          │
          ┌───────────────┼────────────────┐
          ▼               ▼                ▼
       SQLite          Outbox           Audit
          │               │
          │               ▼
          │          Background Jobs
          │               │
          ▼        ┌──────┼──────┐
      Local POS    ▼      ▼      ▼
                 Sync   Search  Webhooks
                   │
                   ▼
             Cloud Database

This gives you a proper commerce kernel rather than four disconnected applications. The same ProductVariant → Inventory → Order → Invoice → Payment → Accounting chain can serve a barcode POS sale, online checkout, marketplace order, subscription invoice, or future mobile application.

