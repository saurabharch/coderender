Plan 1

For a retail/inventory system, I would design barcode handling as a dedicated barcode engine + fast product-entry workflow, rather than treating a barcode as just a string field.

One important correction first:

> The structure you described is essentially UPC-A (12 digits), but the first digit is technically the Number System Digit, not universally a "barcode type" indicator. Also, the 5+5 manufacturer/product split applies to the traditional UPC-A structure, but allocation is controlled by GS1 and can vary in practice.



For your Next.js + SQLite + Prisma application, I recommend supporting UPC-A, EAN-13, EAN-8, internal store barcodes, weighted/variable-price barcodes, and future GS1-DataMatrix/GS1-128 through one normalized barcode model.


---

1. Complete Barcode Architecture

Your inventory flow should look like this:

┌──────────────────────┐
                    │   Product Creation   │
                    └──────────┬───────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
        Scan Existing Barcode          Generate Internal Barcode
                │                             │
                ▼                             ▼
       Barcode Normalization          Barcode Generator
                │                             │
                └──────────────┬──────────────┘
                               ▼
                    ┌──────────────────────┐
                    │ Barcode Validation    │
                    ├──────────────────────┤
                    │ Length               │
                    │ Numeric/alphanumeric │
                    │ Symbology            │
                    │ Check Digit          │
                    │ Duplicate Check       │
                    │ Product Association   │
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │ Inventory Product    │
                    ├──────────────────────┤
                    │ SKU                  │
                    │ Barcode              │
                    │ Product Type         │
                    │ Unit                 │
                    │ Price                │
                    │ Stock                │
                    │ Tax                  │
                    │ Variant              │
                    └──────────────────────┘


---

2. Barcode Types You Should Support

Don't hard-code your application around UPC-A only.

Use:

Barcode	Digits	Typical usage

UPC-A	12	US retail
EAN-13	13	International retail
EAN-8	8	Small products
UPC-E	6	Compressed UPC
Code 128	Variable	Internal/logistics
Code 39	Variable	Legacy/internal
ITF-14	14	Cartons/cases
GS1-128	Variable	Supply chain
GS1 DataMatrix	Variable	Healthcare/product traceability
QR	Variable	Not normally retail POS barcode
Internal SKU barcode	Variable	Your own products
Weighted barcode	Variable	Produce/meat
Coupon barcode	Variable	Promotions


For your first version:

UPC-A
EAN-13
EAN-8
CODE-128
INTERNAL
WEIGHTED

is enough.


---

3. UPC-A Structure

A traditional UPC-A barcode has:

X X X X X X X X X X X X
│ └─────┬─────┘ └─────┬─────┘ │
│       │              │       │
│       │              │       └── Check digit
│       │              └────────── Product code
│       └───────────────────────── Manufacturer code
└───────────────────────────────── Number System

Example:

036000291452

Conceptually:

0 | 36000 | 29145 | 2
│     │       │     │
│     │       │     └── Check digit
│     │       └──────── Product
│     └──────────────── Manufacturer
└────────────────────── Number system

However, do not assume that every UPC-A barcode can always be safely split into exactly 1 + 5 + 5 + 1 for business logic. GS1 allocation rules and prefixes matter.

Your database should therefore store the complete barcode as the authoritative value.


---

4. UPC-A Check Digit

This is one of the most important parts of barcode validation.

For:

036000291452

the final:

2

is the check digit.

Take the first 11 digits:

0 3 6 0 0 0 2 9 1 4 5

Step 1 — Add positions 1, 3, 5, 7, 9, 11

0 + 6 + 0 + 2 + 1 + 5
= 14

Multiply by 3:

14 × 3 = 42

Step 2 — Add positions 2, 4, 6, 8, 10

3 + 0 + 0 + 9 + 4
= 16

Step 3

42 + 16 = 58

Step 4

Find remainder:

58 % 10 = 8

Step 5

10 - 8 = 2

Therefore:

Check digit = 2

Valid barcode:

036000291452
           ↑
        check digit


---

5. Generic UPC-A Validation

Your application should implement:

function validateUPCA(barcode: string): boolean {
  if (!/^\d{12}$/.test(barcode)) {
    return false;
  }

  const digits = barcode.split('').map(Number);

  let oddSum = 0;
  let evenSum = 0;

  for (let i = 0; i < 11; i++) {
    if (i % 2 === 0) {
      oddSum += digits[i];
    } else {
      evenSum += digits[i];
    }
  }

  const total = oddSum * 3 + evenSum;

  const checkDigit = (10 - (total % 10)) % 10;

  return checkDigit === digits[11];
}

This should be part of your reusable:

BarcodeService

rather than being embedded in the product form.


---

6. EAN-13 Validation

You should also support EAN-13.

Example:

8901234567895

EAN-13 uses a similar modulo-10 check digit but with alternating weights.

For the first 12 digits:

position 1 → ×1
position 2 → ×3
position 3 → ×1
position 4 → ×3
...

Then:

checkDigit =
(10 - (sum % 10)) % 10

Implementation:

export function validateEAN13(barcode: string): boolean {
  if (!/^\d{13}$/.test(barcode)) {
    return false;
  }

  const digits = barcode.split('').map(Number);

  let sum = 0;

  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }

  const checkDigit = (10 - (sum % 10)) % 10;

  return checkDigit === digits[12];
}


---

7. Don't Trust Scanner Input

This is important.

A barcode scanner generally behaves like a keyboard.

It may send:

8901234567895
ENTER

Your application should not simply do:

createProduct({
  barcode: scannedBarcode
});

Instead:

Scanner Input
      ↓
Trim
      ↓
Remove scanner terminator
      ↓
Normalize
      ↓
Detect barcode type
      ↓
Validate structure
      ↓
Validate checksum
      ↓
Search existing barcode
      ↓
If found → Open product
      ↓
If not found → Fast Add Product


---

8. Barcode Normalization

Create:

normalizeBarcode()

Example:

export function normalizeBarcode(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, '')
    .replace(/[\r\n]/g, '');
}

For numeric retail barcodes:

" 8901234567895\n"

becomes:

8901234567895


---

9. Never Store Barcode as Integer

This is critical.

Don't do:

barcode Int

Use:

barcode String

Why?

Because valid barcodes can contain leading zeroes:

036000291452

An integer representation could become:

36000291452

and you have destroyed the barcode.


---

10. Recommended Prisma Schema

For your SQLite + Prisma implementation, I'd separate:

Product
ProductVariant
Barcode
Inventory
InventoryLocation
InventoryTransaction
Category
Brand
Unit

Example:

model Product {
  id              String   @id @default(cuid())

  name            String
  slug            String   @unique

  sku             String   @unique

  productType     ProductType
  status          ProductStatus @default(ACTIVE)

  brandId         String?
  categoryId      String?

  description     String?

  costPrice       Decimal?
  sellingPrice    Decimal?

  taxRate         Decimal?

  unitId          String?

  trackInventory  Boolean @default(true)
  allowNegativeStock Boolean @default(false)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  brand           Brand? @relation(fields: [brandId], references: [id])
  category        Category? @relation(fields: [categoryId], references: [id])

  barcodes        Barcode[]
  variants        ProductVariant[]
  inventories     Inventory[]

  @@index([name])
  @@index([categoryId])
  @@index([brandId])
  @@index([productType])
}


---

11. Barcode Model

model Barcode {
  id              String @id @default(cuid())

  code            String
  normalizedCode  String @unique

  type            BarcodeType

  productId       String
  variantId       String?

  isPrimary       Boolean @default(false)
  isActive        Boolean @default(true)

  checkDigitValid Boolean?

  metadata        Json?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  product         Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  variant         ProductVariant? @relation(fields: [variantId], references: [id], onDelete: Cascade)

  @@index([productId])
  @@index([variantId])
  @@index([type])
}


---

12. Barcode Enum

enum BarcodeType {
  UPC_A
  UPC_E
  EAN_13
  EAN_8
  CODE_128
  CODE_39
  ITF_14
  GS1_128
  GS1_DATAMATRIX
  INTERNAL
  WEIGHTED
  COUPON
  UNKNOWN
}


---

13. Product Type

Your product system should distinguish what the product is from how it is sold.

Example:

enum ProductType {
  STANDARD
  VARIANT
  WEIGHTED
  SERVICE
  DIGITAL
  COMPOSITE
  BUNDLE
  KIT
  RAW_MATERIAL
  CONSUMABLE
  PHARMACY
  COUPON
}


---

14. Unit System

Don't store:

kg
kg
KG
Kgs
kilogram

as arbitrary strings.

Create:

model Unit {
  id          String @id @default(cuid())

  code        String @unique
  name        String

  precision   Int @default(0)

  createdAt   DateTime @default(now())

  products    Product[]
}

Seed:

PCS
BOX
PACK
KG
G
MG
L
ML
M
CM
DOZEN
PAIR
SET


---

15. Product Variants

For products like:

T-Shirt
 ├── S / Black
 ├── M / Black
 ├── L / Black
 ├── S / White
 ├── M / White
 └── L / White

use variants.

model ProductVariant {
  id          String @id @default(cuid())

  productId   String

  sku         String @unique

  name        String?

  attributes  Json?

  costPrice   Decimal?
  sellingPrice Decimal?

  stock       Decimal @default(0)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  product     Product @relation(
    fields: [productId],
    references: [id],
    onDelete: Cascade
  )

  barcodes    Barcode[]

  @@index([productId])
}


---

16. Inventory Model

Don't keep inventory only inside Product.

Use inventory records.

model Inventory {
  id          String @id @default(cuid())

  productId   String
  locationId  String?

  quantity    Decimal @default(0)
  reserved    Decimal @default(0)

  reorderLevel Decimal?
  reorderQty   Decimal?

  updatedAt   DateTime @updatedAt

  product     Product @relation(
    fields: [productId],
    references: [id],
    onDelete: Cascade
  )

  @@unique([productId, locationId])
  @@index([productId])
}


---

17. Inventory Transactions

This is extremely important for auditability.

model InventoryTransaction {
  id          String @id @default(cuid())

  productId   String
  variantId   String?
  locationId  String?

  type        InventoryTransactionType

  quantity    Decimal

  referenceType String?
  referenceId   String?

  reason      String?

  createdAt   DateTime @default(now())

  @@index([productId])
  @@index([variantId])
  @@index([createdAt])
}

Enum:

enum InventoryTransactionType {
  OPENING
  PURCHASE
  SALE
  SALE_RETURN
  PURCHASE_RETURN
  ADJUSTMENT_IN
  ADJUSTMENT_OUT
  DAMAGE
  EXPIRY
  TRANSFER_IN
  TRANSFER_OUT
  STOCK_COUNT
}

This gives you a complete stock ledger.


---

18. Fast Product Add Workflow

This is where your application can become significantly better than traditional inventory software.

Imagine the cashier scans:

8901234567895

Your system immediately does:

SCAN
 ↓
Lookup barcode
 ↓
FOUND?
 ├── YES → Add to cart
 │
 └── NO
      ↓
  Quick Product Dialog

The dialog should NOT open a 30-field product form.

Instead:

┌──────────────────────────────────┐
│       Quick Add Product          │
├──────────────────────────────────┤
│ Barcode                          │
│ 8901234567895       ✓ Valid      │
│                                  │
│ Product Name                     │
│ [____________________________]   │
│                                  │
│ Product Type                     │
│ [ Standard Product ▼ ]           │
│                                  │
│ Category                         │
│ [ Select / Create ]              │
│                                  │
│ Selling Price                    │
│ [ ₹ __________ ]                 │
│                                  │
│ Cost Price                       │
│ [ ₹ __________ ]                 │
│                                  │
│ Opening Stock                    │
│ [ __________ ]                   │
│                                  │
│ Unit                             │
│ [ PCS ▼ ]                        │
│                                  │
│       [ Save & Add to Cart ]     │
└──────────────────────────────────┘


---

19. Ultra-Fast Product Creation

For POS usage, I'd support keyboard shortcuts:

F2       Search product
F3       Scan barcode
F4       New product
F6       Add stock
F7       Product lookup
ESC      Close modal
ENTER    Confirm

And scanner workflow:

Scan
 ↓
Existing?
 ↓
YES
 ↓
Add product

No modal.

For a new product:

Scan
 ↓
Unknown
 ↓
Quick Add
 ↓
Enter name
 ↓
Enter price
 ↓
Enter stock
 ↓
ENTER
 ↓
Product created
 ↓
Automatically added to cart


---

20. Product Type Selection Should Change the Form

This is another major UX optimization.

Standard

Name
SKU
Barcode
Price
Cost
Stock
Tax
Unit

Weighted

Name
SKU
Barcode
Price/kg
Cost/kg
Unit = KG
Weight barcode configuration

Service

Name
SKU
Price
Tax

Don't show:

Stock
Warehouse
Weight

for services unless required.

Digital

Name
SKU
Price
Digital asset
Tax

Bundle

Bundle Name
SKU
Components
Quantity
Price


---

21. Barcode Generator

You should support two different concepts:

External barcode

Existing manufacturer barcode:

8901234567895

Don't regenerate it.

Internal barcode

For products without a manufacturer barcode:

200000000001
200000000002
200000000003

Your internal numbering strategy could be:

PREFIX + SEQUENCE + CHECK DIGIT

For example:

20 000001 8

But don't pretend an internally generated number is a GS1-issued UPC/EAN. Label it as an internal barcode.


---

22. Internal Barcode Generation

Create a sequence table:

model BarcodeSequence {
  id          String @id @default(cuid())

  namespace   String @unique
  prefix      String

  nextNumber  BigInt @default(1)

  updatedAt   DateTime @updatedAt
}

Then:

INTERNAL
PREFIX = 200
NEXT = 1234

Generate:

200001234X

where X is your chosen internal check digit if your internal format uses one.

For true retail UPC/EAN issuance, use numbers assigned through the appropriate GS1 process instead of inventing them.


---

23. Barcode Generation Library

For Next.js, use a mature barcode rendering library.

For example:

bwip-js

or:

JsBarcode

Architecture:

BarcodeService
     │
     ├── validate()
     ├── detect()
     ├── generate()
     ├── normalize()
     └── lookup()

UI:

BarcodePreview
BarcodePrintDialog
BarcodeLabel


---

24. Barcode Label Printing

Your product page should have:

Print Barcode

Options:

Label size
├── 30 × 20 mm
├── 40 × 25 mm
├── 50 × 30 mm
├── A4
└── Custom

Information:

Product name
SKU
Barcode
Price

Example:

┌──────────────────────────┐
│     Premium T-Shirt      │
│                          │
│   |||||||||||||||||||    │
│   |||||||||||||||||||    │
│    8901234567895         │
│                          │
│       ₹ 499              │
└──────────────────────────┘


---

25. Barcode Detection Engine

Create:

detectBarcodeType(code)

Conceptually:

if (/^\d{12}$/.test(code)) {
  return "UPC_A";
}

if (/^\d{13}$/.test(code)) {
  return "EAN_13";
}

if (/^\d{8}$/.test(code)) {
  return "EAN_8";
}

return "UNKNOWN";

But length alone isn't sufficient.

Do:

Format validation
+
Checksum validation
+
Business rules


---

26. Validation Result

Don't simply return:

true

Return structured information:

interface BarcodeValidationResult {
  valid: boolean;
  normalized: string;
  type: BarcodeType;

  checksumValid: boolean;

  errors: BarcodeError[];

  manufacturerCode?: string;
  productCode?: string;
  numberSystem?: string;
}

Example:

{
  "valid": true,
  "normalized": "036000291452",
  "type": "UPC_A",
  "checksumValid": true,
  "errors": []
}

Invalid:

{
  "valid": false,
  "normalized": "036000291453",
  "type": "UPC_A",
  "checksumValid": false,
  "errors": [
    {
      "code": "INVALID_CHECK_DIGIT",
      "message": "Barcode check digit is invalid"
    }
  ]
}


---

27. Barcode Error Categories

Create standardized errors.

enum BarcodeErrorCode {
  EMPTY_BARCODE
  INVALID_CHARACTERS
  INVALID_LENGTH
  UNSUPPORTED_FORMAT
  INVALID_CHECK_DIGIT
  DUPLICATE_BARCODE
  INACTIVE_BARCODE
  PRODUCT_NOT_FOUND
  BARCODE_ALREADY_ASSIGNED
  INVALID_WEIGHT_BARCODE
  INVALID_PREFIX
}

This is much better than returning arbitrary strings from multiple components.


---

28. Duplicate Detection

Before creating:

Barcode

perform:

SELECT *
FROM Barcode
WHERE normalizedCode = ?

But also enforce it at the database level:

normalizedCode String @unique

You need both:

Application validation
+
Database constraint

because two simultaneous requests could otherwise create duplicates.


---

29. Fast Barcode Lookup

For SQLite:

@@index([productId])

and:

normalizedCode String @unique

Then:

const barcode = await prisma.barcode.findUnique({
  where: {
    normalizedCode: code
  },
  include: {
    product: true,
    variant: true
  }
});

For POS scanning, this is the critical path and should be extremely lightweight.


---

30. Scanner Architecture in Next.js

I recommend:

POS Screen
     │
     ├── Keyboard scanner
     │
     ├── Camera scanner
     │
     └── Manual barcode
             │
             ▼
       BarcodeInput
             │
             ▼
       BarcodeService
             │
             ├── normalize
             ├── detect
             ├── validate
             └── lookup
                     │
                     ▼
                Product

For camera scanning, consider:

BarcodeDetector API

where available, with a fallback library.


---

31. SQLite + Prisma Architecture

For your application:

Next.js
│
├── app/
│
├── components/
│
├── features/
│   ├── products/
│   ├── inventory/
│   ├── barcode/
│   └── pos/
│
├── lib/
│   ├── prisma.ts
│   ├── barcode/
│   │   ├── detector.ts
│   │   ├── validator.ts
│   │   ├── generator.ts
│   │   ├── normalizer.ts
│   │   └── types.ts
│   │
│   └── inventory/
│
├── server/
│   ├── products/
│   ├── inventory/
│   └── barcode/
│
└── prisma/
    └── schema.prisma


---

32. Recommended API Design

Use server-side actions or route handlers.

Product

POST /api/products
GET  /api/products/:id
PATCH /api/products/:id
DELETE /api/products/:id

Barcode

POST /api/barcodes/validate
POST /api/barcodes/generate
GET  /api/barcodes/:code
POST /api/barcodes/assign
DELETE /api/barcodes/:id

Inventory

POST /api/inventory/adjust
POST /api/inventory/receive
POST /api/inventory/sale
POST /api/inventory/return
GET  /api/inventory/:productId


---

33. Fast Add API

I'd create a dedicated endpoint:

POST /api/products/quick-create

Input:

{
  "barcode": "8901234567895",
  "name": "Premium T-Shirt",
  "productType": "STANDARD",
  "sellingPrice": 499,
  "costPrice": 300,
  "quantity": 25,
  "unit": "PCS",
  "categoryId": "..."
}

Server:

Normalize barcode
       ↓
Validate barcode
       ↓
Check duplicate
       ↓
Generate SKU if necessary
       ↓
Create Product
       ↓
Create Barcode
       ↓
Create Inventory
       ↓
Create OPENING inventory transaction
       ↓
Return product

Ideally execute this as a Prisma transaction.


---

34. Transactional Creation

await prisma.$transaction(async (tx) => {
  const product = await tx.product.create(...);

  await tx.barcode.create(...);

  await tx.inventory.create(...);

  await tx.inventoryTransaction.create(...);

  return product;
});

This prevents:

Product created
Barcode failed
Inventory missing

which would leave inconsistent data.


---

35. Inventory Calculation

Avoid manually changing stock without recording why.

Instead:

Opening + Purchase + Adjustment In
- Sale
- Damage
- Purchase Return
+ Sales Return
+ Transfer In
- Transfer Out

creates the inventory balance.

For high-speed operation, you can maintain:

Inventory.quantity

as the current materialized balance while retaining:

InventoryTransaction

as the ledger.


---

36. Product Import

You should also provide CSV import.

Example:

name,sku,barcode,productType,category,sellingPrice,costPrice,unit,openingStock
Milk 1L,MILK-001,8901234567895,STANDARD,Dairy,65,55,PCS,100
Rice 5KG,RICE-001,8901234567896,STANDARD,Grocery,350,300,PCS,50

Import pipeline:

Upload CSV
 ↓
Parse
 ↓
Normalize
 ↓
Validate each row
 ↓
Barcode validation
 ↓
Duplicate detection
 ↓
Preview
 ↓
Import
 ↓
Transaction
 ↓
Report errors


---

37. Error Preview

Show:

Import Result

Total rows       1,000
Valid              963
Invalid             27
Duplicates          10

And:

Row 42
Barcode: 8901234567893

ERROR:
Invalid check digit

This will save significant operational time.


---

38. Product Search Strategy

For SQLite initially:

barcode
SKU
product name
brand
category

Use indexes.

For example:

@@index([name])
@@index([sku])

Barcode:

normalizedCode @unique

When your catalog becomes very large, you can later introduce a dedicated search engine, but don't over-engineer the initial SQLite implementation.


---

39. Important Security/Integrity Rules

Your backend must NEVER trust:

price
cost
stock
tax
productType
barcode

from the browser blindly.

Validate everything server-side.

For example:

Client
 ↓
Server Action/API
 ↓
Zod validation
 ↓
Business validation
 ↓
Prisma transaction
 ↓
SQLite

Recommended:

Zod
+
Prisma


---

40. Recommended Zod Schema

const QuickProductSchema = z.object({
  name: z.string().min(1).max(200),

  barcode: z.string()
    .trim()
    .min(1)
    .max(100),

  productType: z.enum([
    "STANDARD",
    "WEIGHTED",
    "SERVICE",
    "DIGITAL",
    "BUNDLE"
  ]),

  sellingPrice: z.number().nonnegative(),

  costPrice: z.number().nonnegative().optional(),

  quantity: z.number().nonnegative(),

  unit: z.string().min(1)
});

Then barcode-specific validation occurs after schema validation.


---

41. Recommended UX: "Scan → Sell" and "Scan → Add"

Your system should have two modes.

POS Mode

Scan barcode
 ↓
Product found
 ↓
Add to cart

Unknown barcode:

Unknown barcode
 ↓
[Quick Add]

Inventory Mode

Scan barcode
 ↓
Product found
 ↓
Open inventory

Unknown:

Create product

This distinction makes the same scanner useful across the entire application.


---

42. Product Type + Barcode Strategy

A clean model is:

Product
    │
    ├── Product Type
    │
    ├── SKU
    │
    ├── Barcode(s)
    │
    ├── Variants
    │
    └── Inventory

Don't make:

barcode = product

because one product can have:

UPC-A
EAN-13
Internal barcode
Case barcode
Variant barcode


---

43. Example

Product:

Coca-Cola 500ml

could have:

Product
 ├── SKU: COKE-500
 │
 ├── Barcode
 │    └── EAN-13: 890XXXXXXXXXX
 │
 └── Inventory
      ├── Store A: 120
      └── Store B: 80

A 6-pack could be:

Product
 ├── SKU: COKE-500-6
 └── ITF-14 / internal case barcode


---

44. Complete Implementation Prompt

Below is the prompt I would give to your coding agent.

Implement Production-Grade Barcode, Product and Inventory System

Build a production-ready barcode, product catalog, fast product creation, POS scanning, and inventory management subsystem for an existing Next.js application.

Technology Requirements

Use:

- Next.js with App Router
- TypeScript
- Prisma ORM
- SQLite
- Zod
- React
- Server Actions and/or Next.js Route Handlers
- Existing project UI framework if already present
- Prefer Mantine UI if no established UI system exists
- Use a mature barcode generation/rendering library such as bwip-js or JsBarcode
- Do not introduce Mongoose, MongoDB, PostgreSQL, or another database
- Keep the database layer fully compatible with SQLite + Prisma

Core Objective

Implement a complete barcode lifecycle:

1. Barcode input
2. Barcode normalization
3. Barcode type detection
4. Barcode format validation
5. Check-digit validation
6. Duplicate detection
7. Barcode lookup
8. Product association
9. Barcode generation
10. Internal barcode generation
11. Product quick creation
12. Inventory initialization
13. Inventory transaction recording
14. Barcode label generation
15. Barcode printing
16. CSV product import
17. Import validation/error reporting
18. POS barcode scanning workflow

---

1. Supported Barcode Types

Initially support:

- UPC-A
- UPC-E
- EAN-13
- EAN-8
- CODE-128
- CODE-39
- ITF-14
- INTERNAL
- WEIGHTED
- COUPON
- UNKNOWN

Design the implementation so additional GS1 formats can be added later.

Do not assume all retail barcodes follow the same manufacturer/product segmentation.

---

2. Barcode Normalization

Create:

src/lib/barcode/normalizer.ts

Implement:

normalizeBarcode(value: string): string

Requirements:

- trim whitespace
- remove CR/LF
- remove scanner terminator characters
- preserve leading zeroes
- do not convert barcode into a JavaScript number
- return the canonical string representation

Example:

" 036000291452\n"

must become:

"036000291452"

---

3. Barcode Detection

Create:

src/lib/barcode/detector.ts

Implement:

detectBarcodeType(code: string): BarcodeType

Use structure and length as the initial detection mechanism, followed by checksum validation where applicable.

Do not treat length alone as proof that a barcode is valid.

---

4. Barcode Validation

Create:

src/lib/barcode/validator.ts

Implement:

validateBarcode(code: string): BarcodeValidationResult

The result must contain:

- valid
- normalized
- type
- checksumValid
- errors
- optional numberSystem
- optional manufacturerCode
- optional productCode

Create standardized error codes:

- EMPTY_BARCODE
- INVALID_CHARACTERS
- INVALID_LENGTH
- UNSUPPORTED_FORMAT
- INVALID_CHECK_DIGIT
- DUPLICATE_BARCODE
- BARCODE_ALREADY_ASSIGNED
- INACTIVE_BARCODE
- INVALID_PREFIX
- INVALID_WEIGHT_BARCODE

---

5. UPC-A Check Digit

Implement the standard modulo-10 UPC-A check digit algorithm.

For the first 11 digits:

1. Sum positions 1,3,5,7,9,11
2. Multiply by 3
3. Add positions 2,4,6,8,10
4. Calculate modulo 10
5. Check digit = (10 - remainder) % 10

Example:

036000291452

must validate successfully.

Do not expose the check-digit calculation only in the UI. The server must validate it.

---

6. EAN-13 Check Digit

Implement standard EAN-13 checksum validation.

For the first 12 digits:

- alternating weights of 1 and 3
- calculate modulo 10
- expected check digit = (10 - sum % 10) % 10

Add unit tests for valid and invalid EAN-13 values.

---

7. EAN-8

Implement:

- format validation
- length validation
- checksum validation
- detection

---

8. Barcode Database Model

Create a dedicated Barcode model.

Required fields:

- id
- code
- normalizedCode
- type
- productId
- variantId
- isPrimary
- isActive
- checkDigitValid
- metadata
- createdAt
- updatedAt

normalizedCode must have a unique database constraint.

Do not store barcode as Int, BigInt, or numeric database type.

Barcodes must always be stored as strings to preserve leading zeroes.

---

9. Product Model

Implement:

Product:

- id
- name
- slug
- sku
- productType
- status
- brandId
- categoryId
- description
- costPrice
- sellingPrice
- taxRate
- unitId
- trackInventory
- allowNegativeStock
- createdAt
- updatedAt

SKU must be unique.

Add indexes for:

- name
- sku
- categoryId
- brandId
- productType

---

10. Product Types

Support:

- STANDARD
- VARIANT
- WEIGHTED
- SERVICE
- DIGITAL
- COMPOSITE
- BUNDLE
- KIT
- RAW_MATERIAL
- CONSUMABLE
- PHARMACY
- COUPON

The UI must dynamically change fields according to product type.

For example:

SERVICE should not require normal stock tracking.

WEIGHTED products should expose weight/unit configuration.

BUNDLE products should expose component configuration.

---

11. Product Variants

Implement ProductVariant:

- id
- productId
- sku
- name
- attributes JSON
- costPrice
- sellingPrice
- stock
- createdAt
- updatedAt

Examples:

T-Shirt:

- Small / Black
- Medium / Black
- Large / Black
- Small / White
- Medium / White
- Large / White

Each variant must be able to have its own barcode.

---

12. Unit System

Create Unit:

- id
- code
- name
- precision
- createdAt

Seed:

- PCS
- BOX
- PACK
- KG
- G
- MG
- L
- ML
- M
- CM
- DOZEN
- PAIR
- SET

Do not allow uncontrolled unit strings throughout the application.

---

13. Inventory

Create Inventory:

- id
- productId
- locationId
- quantity
- reserved
- reorderLevel
- reorderQty
- updatedAt

Use a unique constraint on:

productId + locationId

---

14. Inventory Transaction Ledger

Create:

InventoryTransaction

Fields:

- id
- productId
- variantId
- locationId
- type
- quantity
- referenceType
- referenceId
- reason
- createdAt

Transaction types:

- OPENING
- PURCHASE
- SALE
- SALE_RETURN
- PURCHASE_RETURN
- ADJUSTMENT_IN
- ADJUSTMENT_OUT
- DAMAGE
- EXPIRY
- TRANSFER_IN
- TRANSFER_OUT
- STOCK_COUNT

Never modify inventory without recording an inventory transaction when the operation represents a stock movement.

Maintain Inventory.quantity as the current materialized balance and InventoryTransaction as the audit ledger.

---

15. Internal Barcode Generation

Implement an internal barcode generator.

Create BarcodeSequence:

- id
- namespace
- prefix
- nextNumber
- updatedAt

Support generation such as:

200000001
200000002
200000003

or another configurable internal format.

Do not claim that internally generated numbers are GS1-issued UPC/EAN numbers.

Clearly distinguish:

INTERNAL

from:

UPC_A / EAN_13

---

16. Fast Product Creation

Create:

POST /api/products/quick-create

or an equivalent Server Action.

Input:

- barcode
- name
- productType
- sellingPrice
- costPrice
- quantity
- unit
- category
- brand
- taxRate

Flow:

1. Validate request with Zod.
2. Normalize barcode.
3. Detect barcode type.
4. Validate barcode.
5. Check duplicate barcode.
6. Generate SKU if required.
7. Create Product.
8. Create Barcode.
9. Create Inventory.
10. Create OPENING inventory transaction when opening quantity > 0.
11. Commit everything in one Prisma transaction.
12. Return the created product.

Never allow partial product creation.

---

17. Scanner Workflow

Implement a reusable:

BarcodeScannerInput

component.

Scanner input should behave like keyboard input.

Flow:

SCAN
→ normalize
→ detect
→ validate
→ lookup

If found:

→ return product

If not found:

→ show Fast Add Product dialog

Do not require users to manually submit a long product form for an unknown barcode.

---

18. POS Workflow

Implement:

Scan barcode
→ Existing product?
→ YES
→ Add to cart

Unknown barcode:

Scan
→ Unknown
→ Quick Add Product
→ Enter product name
→ Enter selling price
→ Enter stock
→ Save
→ Automatically add product to cart

Avoid unnecessary confirmation dialogs.

---

19. Keyboard Shortcuts

Implement configurable shortcuts:

F2 = product search

F3 = barcode scan

F4 = new product

F6 = inventory adjustment

F7 = product lookup

ESC = close active dialog

ENTER = confirm

Do not interfere with normal text input behavior.

---

20. Quick Add UI

Create a compact dialog.

Required fields:

- Barcode
- Product Name
- Product Type
- Category
- Selling Price
- Cost Price
- Opening Stock
- Unit

Barcode field must immediately show:

Valid Barcode
or
Invalid Check Digit
or
Duplicate Barcode

Do not show irrelevant fields for the selected product type.

Primary action:

Save & Add to Cart

Secondary action:

Save Product

---

21. Barcode Lookup

Create:

GET /api/barcodes/:code

The lookup should:

1. normalize input
2. query normalizedCode
3. return product
4. return variant
5. return current inventory
6. return barcode metadata

The barcode lookup path should be optimized for POS usage.

---

22. Barcode Assignment

Implement:

POST /api/barcodes/assign

Requirements:

- validate barcode
- detect type
- verify duplicate
- associate with product/variant
- support primary barcode
- prevent multiple active assignments to different products

---

23. Barcode Generation UI

Create:

BarcodeGeneratorDialog

Features:

- choose barcode type
- enter/generate value
- validate value
- preview barcode
- display human-readable number
- print barcode
- download/print label

Never generate an arbitrary UPC/EAN and represent it as an officially allocated retail barcode.

---

24. Barcode Labels

Create reusable:

BarcodeLabel

Display:

- product name
- SKU
- barcode
- barcode number
- price

Support:

- 30x20 mm
- 40x25 mm
- 50x30 mm
- A4
- custom label size

Use print CSS.

Avoid screenshots/canvas-based printing where possible.

---

25. CSV Import

Implement:

Product CSV Import.

Columns:

name
sku
barcode
productType
category
brand
sellingPrice
costPrice
taxRate
unit
openingStock

Import flow:

Upload
→ Parse
→ Validate
→ Preview
→ Import

Preview must show:

Total
Valid
Invalid
Duplicates

For every invalid row show:

row number
field
value
error code
human-readable error

---

26. Database Constraints

Use database-level constraints wherever possible.

Required:

Barcode.normalizedCode UNIQUE

Product.sku UNIQUE

ProductVariant.sku UNIQUE

Unit.code UNIQUE

BarcodeSequence.namespace UNIQUE

Do not rely only on JavaScript duplicate checks.

---

27. Prisma Transactions

Product creation with inventory must use:

prisma.$transaction()

Example conceptual transaction:

Product
+
Barcode
+
Inventory
+
Opening InventoryTransaction

must either all succeed or all fail.

---

28. Validation Layer

Use three validation layers:

Layer 1:
Zod request validation

Layer 2:
Business validation

Layer 3:
Database constraints

Never trust browser-supplied:

- price
- cost
- stock
- barcode
- tax
- product type
- category

---

29. Error Handling

Create typed application errors.

Example:

BarcodeValidationError

DuplicateBarcodeError

ProductNotFoundError

InventoryValidationError

InvalidProductTypeError

Map these into consistent API responses.

Example:

{
"success": false,
"error": {
"code": "INVALID_CHECK_DIGIT",
"message": "The barcode check digit is invalid."
}
}

Never expose raw Prisma errors directly to the frontend.

---

30. Testing

Create unit tests for:

- barcode normalization
- UPC-A detection
- UPC-A checksum
- EAN-13 checksum
- EAN-8 checksum
- invalid length
- invalid characters
- duplicate barcode
- leading zero barcode
- internal barcode generation
- product creation
- inventory transaction
- variant barcode assignment

Create integration tests for:

Scan
→ lookup
→ product found

and:

Scan
→ unknown
→ quick create
→ product created
→ inventory created
→ barcode assigned

---

31. Performance Requirements

Barcode lookup must be optimized.

Do not:

- load the entire product catalog
- perform client-side filtering across thousands of products
- query multiple unrelated tables before determining whether a barcode exists

Use:

normalizedCode UNIQUE INDEX

as the primary lookup mechanism.

For POS:

barcode lookup should be a single optimized database lookup followed by only the required product/inventory data.

---

32. UI Requirements

Build a professional retail/POS experience.

Prioritize:

- keyboard operation
- barcode scanner operation
- minimal clicks
- fast dialogs
- clear validation
- instant duplicate detection
- responsive layout
- mobile/tablet compatibility

Use optimistic UI only where data consistency cannot be compromised.

---

33. Architecture

Use this structure:

src/
app/
components/
features/
barcode/
products/
inventory/
pos/
lib/
barcode/
detector.ts
generator.ts
normalizer.ts
validator.ts
types.ts
inventory/
products/
server/
barcode/
products/
inventory/

prisma/
schema.prisma
seed.ts

Keep barcode logic independent from React components.

Barcode algorithms must be reusable from:

- server
- tests
- import service
- product creation
- POS
- admin panel

---

34. Important Barcode Rule

Do not interpret the first UPC-A digit as universally identifying the barcode type.

For UPC-A, it is the Number System Digit.

Do not hard-code assumptions that:

0 = standard product
2 = weighted
3 = pharmacy
5 = coupon

as universal UPC-A rules.

If weighted/coupon/pharmacy formats are required, implement them as configurable business/GS1 parsing rules rather than treating the first digit alone as a universal barcode classification.

---

35. Deliverables

Implement the complete feature, not only UI mockups.

Deliver:

1. Prisma schema
2. Prisma migrations
3. Seed data
4. Barcode validation service
5. Barcode detection service
6. Barcode generation service
7. Barcode normalization service
8. Barcode database repository/service
9. Product service
10. Inventory service
11. POS scanner component
12. Quick product creation component
13. Barcode generator component
14. Barcode label component
15. Barcode printing
16. CSV import
17. API/server actions
18. Zod schemas
19. Typed error handling
20. Unit tests
21. Integration tests
22. Documentation

Before modifying existing files, inspect the existing project architecture and reuse existing conventions.

Do not unnecessarily replace existing UI libraries, routing, state management, authentication, or database infrastructure.

Use Prisma migrations and preserve existing data.

At completion, provide:

- files created
- files modified
- database changes
- API endpoints
- Prisma commands
- seed commands
- test commands
- development run instructions
- production considerations
- known limitations
- recommended next improvements
---

45. One More Important Improvement: Make Product Entry "Context-Aware"

For your broader business/inventory platform, I would actually take this one step further.

Instead of one generic Add Product form, implement:

ADD PRODUCT
                      │
       ┌──────────────┼──────────────┐
       │              │              │
    SCAN BARCODE   ENTER SKU     CREATE INTERNAL
       │              │           BARCODE
       └──────────────┼──────────────┘
                      ▼
                PRODUCT TYPE
                      │
       ┌──────────────┼──────────────┐
       │              │              │
   STANDARD       WEIGHTED        SERVICE
       │              │              │
       ▼              ▼              ▼
  Fast Fields    Weight Fields    Service Fields
       │              │              │
       └──────────────┼──────────────┘
                      ▼
                INVENTORY
                      │
                      ▼
                 SAVE PRODUCT
                      │
                      ▼
              READY FOR POS

That gives you a single inventory engine that can eventually support your retail, billing, ecommerce, catalogue, subscription/product, and POS workflows rather than creating separate product models for each feature.

Recommended final database relationship

Category
   │
   ▼
Product ───────────────┐
   │                   │
   ├── ProductVariant  │
   │        │          │
   │        └── Barcode│
   │                   │
   └────── Barcode ────┘
           │
           ▼
       Inventory
           │
           ▼
 InventoryTransaction

The key design decision is to keep Barcode, Product, Variant, and InventoryTransaction separate. That gives you enough flexibility for UPC/EAN products, internally generated products, variants, weighted products, multiple warehouses, POS scanning, ecommerce catalogues, and future GS1 support without redesigning your database.


Plan 2

I would expand the design so product type, sale channel, fulfillment method, inventory behavior, and barcode behavior are separate dimensions. Otherwise the schema will become restrictive when you later add ecommerce, POS, subscriptions, services, bundles, rentals, digital products, etc.

1. Product classification should not be one enum

Instead of:

ProductType = STANDARD | SERVICE | DIGITAL | ...

use multiple classifications:

Product
│
├── ProductKind
│     ├── PHYSICAL
│     ├── DIGITAL
│     ├── SERVICE
│     ├── SUBSCRIPTION
│     ├── MEMBERSHIP
│     ├── BUNDLE
│     ├── KIT
│     ├── COMPOSITE
│     ├── RENTAL
│     ├── LICENSE
│     ├── GIFT_CARD
│     ├── VOUCHER
│     └── DONATION
│
├── InventoryBehavior
│     ├── STOCKED
│     ├── NON_STOCKED
│     ├── MADE_TO_ORDER
│     ├── DIGITAL_DELIVERY
│     ├── SERVICE
│     └── DROP_SHIP
│
├── SalesChannel
│     ├── POS
│     ├── ONLINE
│     ├── MARKETPLACE
│     ├── API
│     └── BOTH
│
└── Fulfillment
      ├── STORE_PICKUP
      ├── DELIVERY
      ├── SHIPPING
      ├── DIGITAL
      ├── SERVICE_APPOINTMENT
      └── NONE

This is much more scalable.


---

2. Complete Product Types

I recommend supporting these categories.

Product type	Offline	Online	Inventory	Barcode

Standard physical	✅	✅	✅	✅
Variant product	✅	✅	✅	✅
Weighted product	✅	✅	✅	✅
Perishable	✅	✅	✅	✅
Batch/lot product	✅	✅	✅	✅
Serialized product	✅	✅	✅	✅
Service	✅	✅	❌	Optional
Digital product	❌/✅	✅	❌	Optional
Subscription	❌/✅	✅	❌	Optional
Membership	❌/✅	✅	❌	Optional
Bundle	✅	✅	Derived	Optional
Kit	✅	✅	Derived	Optional
Composite/BOM	✅	✅	Components	Optional
Made-to-order	✅	✅	On demand	Optional
Dropship	❌/✅	✅	Supplier	Optional
Rental	✅	✅	Availability	Optional
License	❌/✅	✅	License count	Optional
Gift card	✅	✅	Value-based	Barcode/QR
Voucher	✅	✅	Redemption	Barcode/QR
Coupon	✅	✅	❌	Barcode/QR
Donation	❌/✅	✅	❌	❌
Event/ticket	❌/✅	✅	Capacity	QR/barcode
Appointment	❌/✅	✅	Capacity	Optional
Custom product	✅	✅	Configurable	Optional


This covers substantially more real-world commerce scenarios.


---

3. Add Product "Sale Mode"

A product should be able to be sold:

OFFLINE_ONLY
ONLINE_ONLY
OMNICHANNEL

But I'd actually model it with a relation instead of an enum if you expect more channels later.

Example:

enum SalesChannel {
  POS
  ONLINE_STORE
  MARKETPLACE
  MOBILE_APP
  API
  SOCIAL_COMMERCE
  WHOLESALE
}

Then:

model ProductChannel {
  id        String @id @default(cuid())

  productId String
  channel   SalesChannel

  isEnabled Boolean @default(true)

  onlinePrice Decimal?
  minOrderQty Decimal?
  maxOrderQty Decimal?

  publishedAt DateTime?

  product Product @relation(
    fields: [productId],
    references: [id],
    onDelete: Cascade
  )

  @@unique([productId, channel])
}

Now the same product can have:

Coca-Cola 500ml

POS              ✓
Online Store     ✓
Mobile App       ✓
Wholesale        ✓
Marketplace      ✗


---

4. Online Product Data

Don't put ecommerce-specific fields directly into Product.

Create:

model ProductOnline {
  id              String @id @default(cuid())

  productId       String @unique

  title           String?
  slug            String @unique

  description     String?
  shortDescription String?

  seoTitle        String?
  seoDescription  String?

  published       Boolean @default(false)

  visibility      ProductVisibility @default(PUBLIC)

  allowBackorder  Boolean @default(false)

  minOrderQty     Decimal?
  maxOrderQty     Decimal?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  product Product @relation(
    fields: [productId],
    references: [id],
    onDelete: Cascade
  )
}

This keeps POS/catalogue data separate from ecommerce presentation.


---

5. Online Product Media

You'll eventually need:

Product
 ├── Images
 ├── Videos
 ├── Documents
 ├── Manuals
 ├── Certificates
 └── Marketing assets

Use:

model ProductMedia {
  id        String @id @default(cuid())

  productId String

  type      ProductMediaType

  url       String
  altText   String?

  sortOrder Int @default(0)

  isPrimary Boolean @default(false)

  createdAt DateTime @default(now())

  product Product @relation(
    fields: [productId],
    references: [id],
    onDelete: Cascade
  )

  @@index([productId])
}

Types:

enum ProductMediaType {
  IMAGE
  VIDEO
  DOCUMENT
  MANUAL
  CERTIFICATE
  MODEL_3D
}


---

6. Physical Product Needs Shipping Data

This is one of the important gaps in the previous design.

For online sale, physical products need:

weight
length
width
height
shipping class
fragile
hazardous
temperature controlled
requires shipping

Create:

model ProductShipping {
  id        String @id @default(cuid())

  productId String @unique

  weight    Decimal?
  weightUnit String?

  length    Decimal?
  width     Decimal?
  height    Decimal?
  dimensionUnit String?

  shippingClass String?

  requiresShipping Boolean @default(true)

  fragile Boolean @default(false)

  product Product @relation(
    fields: [productId],
    references: [id],
    onDelete: Cascade
  )
}


---

7. Perishable Products

For grocery, food, medicine, cosmetics, etc., you need batch/expiry.

Don't try to handle this using only Product.

model ProductBatch {
  id          String @id @default(cuid())

  productId   String

  batchNumber String

  manufacturingDate DateTime?
  expiryDate DateTime?

  quantity Decimal @default(0)

  costPrice Decimal?

  createdAt DateTime @default(now())

  product Product @relation(
    fields: [productId],
    references: [id],
    onDelete: Cascade
  )

  @@unique([productId, batchNumber])
  @@index([expiryDate])
}

This enables:

FIFO
FEFO
Batch tracking
Expiry alerts
Recall


---

8. Serialized Products

For:

Mobile phones
Laptops
TVs
Cameras
Electronics
Machinery

you need serial numbers.

model ProductSerial {
  id        String @id @default(cuid())

  productId String
  variantId String?

  serialNumber String @unique

  status SerialStatus @default(IN_STOCK)

  purchaseDate DateTime?
  saleDate DateTime?

  createdAt DateTime @default(now())

  product Product @relation(
    fields: [productId],
    references: [id]
  )
}

Status:

enum SerialStatus {
  IN_STOCK
  RESERVED
  SOLD
  RETURNED
  DAMAGED
  WARRANTY
  LOST
}


---

9. Digital Products

Examples:

PDF
Course
Software
Template
Video
Music
Download
E-book

Create:

model DigitalProduct {
  id        String @id @default(cuid())

  productId String @unique

  deliveryType DigitalDeliveryType

  assetId String?

  downloadLimit Int?
  expiryHours Int?

  requiresLogin Boolean @default(false)

  product Product @relation(
    fields: [productId],
    references: [id],
    onDelete: Cascade
  )
}


---

10. Subscription Products

Your existing SaaS/business direction makes this especially useful.

Examples:

Monthly plan
Annual plan
Business subscription
Software license
Maintenance plan

Create:

model SubscriptionProduct {
  id        String @id @default(cuid())

  productId String @unique

  billingInterval BillingInterval

  intervalCount Int @default(1)

  trialDays Int @default(0)

  autoRenew Boolean @default(true)

  product Product @relation(
    fields: [productId],
    references: [id],
    onDelete: Cascade
  )
}


---

11. Bundle vs Kit vs Composite

These should not be treated as the same thing.

Bundle

Customer buys:

Laptop Bundle
= Laptop
+ Mouse
+ Bag

Usually marketed as one product.

Kit

Used operationally:

Installation Kit
= 5 components

Composite/BOM

Manufacturing:

Product A
 ├── Component X
 ├── Component Y
 └── Component Z

Create:

model ProductComponent {
  id              String @id @default(cuid())

  parentProductId String
  componentProductId String

  quantity        Decimal

  parentProduct Product @relation(
    "ParentProductComponents",
    fields: [parentProductId],
    references: [id]
  )

  componentProduct Product @relation(
    "ComponentProductComponents",
    fields: [componentProductId],
    references: [id]
  )

  @@unique([parentProductId, componentProductId])
}


---

12. Rental Products

Examples:

Camera
Projector
Car
Equipment
Furniture

Inventory is not simply:

quantity = 10

You need availability periods.

Eventually:

RentalAsset
RentalBooking
RentalContract
RentalReturn

This should be an optional module, but reserve the architecture now.


---

13. Gift Cards

A gift card is not a normal inventory product.

It has:

Face value
Selling price
Balance
Activation
Expiration
Redemption

Create a separate:

GiftCard
GiftCardTransaction

and associate the underlying Product.


---

14. Event/Ticket Products

You may eventually sell:

Concert tickets
Conference tickets
Admission tickets
Appointments
Classes

These are capacity-based rather than stock-based.

Use:

Product
   ↓
Event
   ↓
TicketType
   ↓
Ticket


---

15. Add "Inventory Behavior"

This is essential.

enum InventoryBehavior {
  STOCKED
  NON_STOCKED
  WEIGHTED
  SERIALIZED
  BATCH_TRACKED
  MADE_TO_ORDER
  DROP_SHIP
  DIGITAL
  SERVICE
  CAPACITY
  RENTAL
  DERIVED
}

Then:

model Product {
  ...
  inventoryBehavior InventoryBehavior
}

This allows the inventory engine to decide what to do.

For example:

STANDARD
→ quantity

WEIGHTED
→ quantity + weight

SERIALIZED
→ serial numbers

BATCH_TRACKED
→ batches

DIGITAL
→ no physical inventory

SERVICE
→ no stock

RENTAL
→ availability calendar

CAPACITY
→ available seats/slots


---

16. Product Availability

Add:

enum AvailabilityStatus {
  ACTIVE
  INACTIVE
  OUT_OF_STOCK
  PREORDER
  BACKORDER
  COMING_SOON
  DISCONTINUED
}

This should be different from:

Product.status

because a product can be active but temporarily out of stock.


---

17. Online vs Offline Pricing

Don't assume one price forever.

You may eventually have:

MRP
POS Price
Online Price
Wholesale Price
Marketplace Price
Member Price
Promotional Price

Create:

model ProductPrice {
  id        String @id @default(cuid())

  productId String
  variantId String?

  priceType PriceType

  amount    Decimal

  currency  String @default("INR")

  minQty    Decimal?
  maxQty    Decimal?

  startsAt  DateTime?
  endsAt    DateTime?

  isActive  Boolean @default(true)

  createdAt DateTime @default(now())

  @@index([productId, priceType])
}


---

18. Pricing Types

enum PriceType {
  MRP
  RETAIL
  POS
  ONLINE
  WHOLESALE
  MARKETPLACE
  MEMBER
  SALE
  PROMOTIONAL
  COST
}

This is far more future-proof than:

Product.sellingPrice

alone.

You can retain sellingPrice as a cached/default value for performance, but the pricing engine should eventually become authoritative.


---

19. Tax Configuration

Product tax should also be extensible.

TaxCategory
TaxRate
ProductTax

For India you may eventually need:

GST
CGST
SGST
IGST
CESS

Don't hard-code tax logic into Product.


---

20. The Complete Product Architecture

I recommend this final conceptual structure:

PRODUCT
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
     CLASSIFICATION      CATALOGUE          COMMERCE
          │                 │                 │
     ProductKind        Name/Description    Prices
     InventoryBehavior  Categories          Tax
     Fulfillment         Brand              Channels
          │              Media              Discounts
          │              SEO
          │
    ┌─────┼──────────┐
    │     │          │
 Barcode Batch    Serial
    │     │          │
    └─────┼──────────┘
          │
      INVENTORY
          │
    ┌─────┼─────────────┐
    │     │             │
 Location Batch       Serial
    │
 Transactions
          │
          ▼
       SALES
          │
   ┌──────┼───────────┐
   │      │           │
  POS   ONLINE     MARKETPLACE
   │      │           │
   └──────┼───────────┘
          │
       ORDER
          │
      FULFILLMENT
          │
    ┌─────┼─────────┐
    │     │         │
 Pickup Shipping Digital


---

21. Important Implementation Gaps to Add to the Previous Prompt

Add these sections to the implementation prompt:

Extend the previously specified Barcode + Product + Inventory implementation into a complete omnichannel commerce product engine.

The architecture MUST NOT treat "product type", "sales channel", "inventory behavior", and "fulfillment method" as the same concept.

Product Classification

Support:

- STANDARD_PHYSICAL
- VARIANT
- WEIGHTED
- PERISHABLE
- BATCH_TRACKED
- SERIALIZED
- SERVICE
- DIGITAL
- SUBSCRIPTION
- MEMBERSHIP
- BUNDLE
- KIT
- COMPOSITE
- MADE_TO_ORDER
- DROP_SHIP
- RENTAL
- LICENSE
- GIFT_CARD
- VOUCHER
- COUPON
- EVENT_TICKET
- APPOINTMENT
- DONATION
- CUSTOM

Design this so additional types can be introduced without destructive database changes.

Inventory Behavior

Support:

- STOCKED
- NON_STOCKED
- WEIGHTED
- SERIALIZED
- BATCH_TRACKED
- MADE_TO_ORDER
- DROP_SHIP
- DIGITAL
- SERVICE
- CAPACITY
- RENTAL
- DERIVED

The inventory engine must behave differently according to this classification.

Examples:

STANDARD_PHYSICAL:
quantity-based inventory.

WEIGHTED:
quantity/weight-based inventory.

SERIALIZED:
individual serial-number tracking.

BATCH_TRACKED:
lot/batch and expiry tracking.

SERVICE:
no physical stock.

DIGITAL:
digital delivery instead of physical fulfillment.

RENTAL:
availability by time period.

CAPACITY:
capacity/slot-based availability.

BUNDLE:
inventory derived from component products.

COMPOSITE:
component/BOM-based inventory.

Sales Channels

Products must support multiple sales channels.

Support:

- POS
- ONLINE_STORE
- MOBILE_APP
- MARKETPLACE
- API
- SOCIAL_COMMERCE
- WHOLESALE

Create ProductChannel.

A product may be:

- POS only
- Online only
- Omnichannel
- Wholesale only
- available through multiple channels

Do not encode this as one irreversible Product enum.

Online Catalogue

Create ProductOnline.

Support:

- online title
- slug
- description
- short description
- SEO title
- SEO description
- publication state
- visibility
- backorder
- preorder
- minimum order quantity
- maximum order quantity

Product Media

Create ProductMedia.

Support:

- image
- video
- document
- manual
- certificate
- 3D model

Support primary media and ordering.

Shipping

Create ProductShipping.

Support:

- weight
- dimensions
- weight unit
- dimension unit
- shipping class
- fragile
- hazardous flag
- temperature controlled flag
- requires shipping

Batch Tracking

Create ProductBatch.

Support:

- batch number
- manufacturing date
- expiry date
- quantity
- cost
- product association

Implement FEFO/FIFO-ready architecture.

Serial Tracking

Create ProductSerial.

Support:

- serial number
- product
- variant
- status
- purchase date
- sale date
- warranty state

Prevent duplicate serial numbers.

Digital Products

Create DigitalProduct.

Support:

- downloadable files
- download limits
- expiration
- digital delivery
- authentication requirement

Never create physical inventory transactions for digital products.

Subscription Products

Create SubscriptionProduct.

Support:

- billing interval
- interval count
- trial days
- auto renewal

Keep recurring billing metadata separate from physical inventory.

Bundle/Kit/Composite

Implement ProductComponent.

Support:

- parent product
- component product
- quantity

Bundles and kits must not blindly duplicate physical inventory.

Inventory availability should be calculated from their components where appropriate.

Rental

Design extension points for:

- rental assets
- rental availability
- rental booking
- rental checkout
- rental return

Do not force rental inventory into simple quantity-based inventory.

Event/Ticket

Design extension points for:

- event
- venue
- ticket type
- capacity
- ticket issuance
- QR/barcode
- redemption

Gift Cards

Design:

GiftCard
GiftCardTransaction

Support:

- face value
- current balance
- activation
- expiration
- redemption
- cancellation

Voucher/Coupon

Separate promotional coupons from physical inventory.

Support:

- coupon code
- barcode/QR
- validity
- usage limit
- customer limit
- minimum order
- maximum discount
- applicable products/categories/channels

Pricing

Do not rely only on Product.sellingPrice.

Create ProductPrice.

Support:

- MRP
- retail
- POS
- online
- wholesale
- marketplace
- member
- sale
- promotional
- cost

Support:

- currency
- quantity tiers
- effective start/end dates
- active state

The system must be able to return the correct price according to:

product
+
variant
+
sales channel
+
customer type
+
quantity
+
promotion
+
effective date

Availability

Separate product lifecycle status from inventory availability.

Support:

- ACTIVE
- INACTIVE
- OUT_OF_STOCK
- PREORDER
- BACKORDER
- COMING_SOON
- DISCONTINUED

Omnichannel Inventory

The same physical inventory must be usable by multiple channels.

Example:

Store inventory:
100

POS available:
100

Online available:
100

If an online order reserves 5:

physical quantity:
100

reserved:
5

available:
95

Do not duplicate stock merely because the product exists in multiple channels.

Implement:

physical quantity
reserved quantity
available quantity

where:

available = quantity - reserved

Fulfillment

Support:

- STORE_PICKUP
- LOCAL_DELIVERY
- SHIPPING
- DIGITAL_DELIVERY
- SERVICE_APPOINTMENT
- RENTAL
- NONE

The order system must select fulfillment according to product type and channel.

Product Creation UX

The Add Product screen must dynamically adapt.

Example:

STANDARD:
name, barcode, SKU, price, stock, unit.

WEIGHTED:
name, barcode, price/unit, weight unit.

SERVICE:
name, price, duration, tax.

DIGITAL:
name, price, downloadable asset.

SUBSCRIPTION:
name, recurring price, billing interval.

BUNDLE:
name, components, bundle price.

SERIALIZED:
name, barcode, serial tracking.

BATCH:
name, barcode, batch/expiry tracking.

RENTAL:
name, rental price, availability.

Do not display irrelevant fields.

Fast Product Entry

Support:

Scan barcode
→ lookup
→ found
→ add to POS

Unknown:

Scan barcode
→ unknown
→ Quick Add
→ name
→ product type
→ price
→ opening stock if applicable
→ save
→ automatically continue transaction

For services/digital/subscription products, hide stock fields.

Online + Offline Product

Every product must be capable of being configured for:

OFFLINE/POS
ONLINE
BOTH

Do not duplicate the product itself.

Use ProductChannel to control availability.

Database Integrity

Use:

- unique SKU
- unique normalized barcode
- unique serial number
- unique batch per product
- unique product/channel relationship
- transactional inventory operations
- Prisma transactions
- Zod validation
- typed business errors

Future Compatibility

Keep extension points for:

- ecommerce orders
- POS orders
- marketplace orders
- subscriptions
- recurring billing
- procurement
- suppliers
- warehouses
- multiple stores
- transfers
- returns
- refunds
- loyalty
- promotions
- coupons
- gift cards
- shipping
- delivery
- accounting
- tax
- customer-specific pricing
- wholesale pricing
- AI product categorization
- product import/export

Do not implement these as unrelated duplicate product systems.

Product must remain the canonical catalogue entity.
Inventory must remain the canonical physical availability system.
Barcode must remain the canonical scanning/identification system.
ProductChannel must control where the product can be sold.
ProductPrice must control how the product is priced.
Fulfillment configuration must control how the product is delivered.
---

22. The Biggest Architecture Gap to Avoid

The most important thing I'd change from a basic inventory implementation is this:

Don't build:

Product
 ├── barcode
 ├── price
 ├── stock
 └── online = true/false

Build:

Product
                            │
       ┌────────────────────┼────────────────────┐
       ▼                    ▼                    ▼
 Classification        Catalogue             Identity
       │                    │                    │
 Type                   Name/SEO             SKU
 Inventory behavior    Media                 Barcode
 Fulfillment            Category              Serial
       │                                       Batch
       ▼
   Inventory
       │
       ▼
 Inventory Ledger

Product
   │
   ├── ProductChannel
   │       ├── POS
   │       ├── Online
   │       ├── Marketplace
   │       └── Wholesale
   │
   ├── ProductPrice
   │
   ├── ProductOnline
   │
   └── ProductShipping

That architecture gives you a single product master that can sell the same item through your physical shop, POS, website, mobile app, marketplace, API, and wholesale channel without duplicating products or corrupting inventory.

For your longer-term platform, this is the right foundation because it also leaves room for ecommerce + POS + billing + inventory + subscriptions + digital products + services + marketplace + accounting integration without having to redesign the product database later.


Plan 3

The target capabilities, I would stop thinking of this as an inventory module and design it as a unified Commerce & Business Operating Platform.

The key is a single product/customer/order/transaction ledger, with specialized modules around it.

1. Target platform architecture

┌─────────────────────┐
                         │   ADMIN / BACKOFFICE │
                         └──────────┬──────────┘
                                    │
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
             ▼                      ▼                      ▼
        E-COMMERCE                 POS                MARKETPLACE
             │                      │                      │
             └──────────────────────┼──────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │  COMMERCE ENGINE    │
                         └──────────┬──────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       │                            │                            │
       ▼                            ▼                            ▼
   PRODUCT                    ORDER ENGINE                 CUSTOMER
   CATALOGUE                       │                       / CRM
       │                            │
       ▼                            ▼
   INVENTORY                   BILLING
       │                            │
       ▼                            ▼
   PROCUREMENT                 PAYMENTS
       │                            │
       └──────────────┬─────────────┘
                      ▼
               ACCOUNTING LEDGER
                      │
          ┌───────────┼────────────┐
          ▼           ▼            ▼
       GST/Tax     Reports      Reconciliation

Then add:

Subscriptions
Digital Products
Services
Loyalty
Promotions
Shipping
Delivery
Marketplace
Accounting integrations

as first-class modules.


---

2. The most important architectural rule

You need one canonical Product.

Not:

EcommerceProduct
POSProduct
SubscriptionProduct
InventoryProduct
MarketplaceProduct

Instead:

Product
                       │
       ┌───────────────┼────────────────┐
       │               │                │
    Physical        Digital          Service
       │               │                │
    Inventory       Assets         Appointment
       │
    Variants
       │
    Barcodes

And then:

Product
   │
   ├── ProductChannel
   ├── ProductPrice
   ├── ProductTax
   ├── ProductMedia
   ├── ProductSEO
   ├── ProductShipping
   ├── ProductVariant
   ├── Barcode
   ├── Batch
   ├── Serial
   └── Inventory

This is the foundation.


---

3. Commerce domains

I would split your application into these bounded domains.

Core

Identity
Organization
Users
Roles
Permissions
Stores
Locations
Currencies
Tax

Catalogue

Products
Categories
Brands
Attributes
Variants
Bundles
Kits
Digital products
Services
Subscriptions
Pricing
Promotions
Barcode

Inventory

Warehouses
Stores
Stock
Batches
Serial numbers
Stock movements
Transfers
Adjustments
Purchase orders
Suppliers
Goods receiving

Sales

POS
Cart
Orders
Invoices
Returns
Refunds
Discounts
Payments

Ecommerce

Storefront
Search
Product listing
Product detail
Cart
Checkout
Customer account
Wishlist
Reviews
Shipping
Delivery
Coupons

Marketplace

Sellers
Seller onboarding
Seller catalogue
Seller pricing
Seller inventory
Orders
Commission
Settlement
Payout
Seller analytics

Billing

Invoices
Credit notes
Debit notes
Recurring billing
Subscriptions
Payment collection
Payment retries
Dunning

Accounting

Chart of accounts
Journal
Ledger
Receivables
Payables
Tax
Bank reconciliation
Settlement reconciliation
Financial reports


---

4. Unified Order Model

This is another critical decision.

Don't create:

POSOrder
OnlineOrder
MarketplaceOrder
SubscriptionOrder

as completely separate systems.

Use:

Order

with:

OrderChannel

For example:

enum OrderChannel {
  POS
  ONLINE
  MOBILE
  MARKETPLACE
  API
  WHOLESALE
  SUBSCRIPTION
}

Then:

Order #10001

channel = POS

or:

Order #10002

channel = ONLINE

or:

Order #10003

channel = MARKETPLACE

All ultimately use the same order engine.


---

5. Order lifecycle

Use a state machine.

DRAFT
  ↓
PENDING
  ↓
CONFIRMED
  ↓
PAID
  ↓
PROCESSING
  ↓
FULFILLED
  ↓
COMPLETED

Alternative paths:

PENDING
   ↓
CANCELLED

PAID
 ↓
REFUND_REQUESTED
 ↓
REFUNDED

FULFILLED
 ↓
RETURN_REQUESTED
 ↓
RETURNED
 ↓
REFUNDED

Don't implement status changes as arbitrary string updates.


---

6. Order architecture

Order
│
├── OrderItem
│     │
│     ├── Product
│     ├── Variant
│     ├── Quantity
│     ├── Price
│     ├── Discount
│     ├── Tax
│     └── Fulfillment
│
├── Payment
│
├── Shipment
│
├── Invoice
│
├── Refund
│
└── OrderEvent

This allows POS and ecommerce to share the same engine.


---

7. Inventory integration

When an order is confirmed:

Order
 ↓
Inventory Reservation
 ↓
Payment
 ↓
Fulfillment
 ↓
Inventory Deduction

Don't immediately deduct stock merely because someone added something to cart.

Use:

On Hand
Reserved
Available

Formula:

Available = OnHand - Reserved

Example:

On Hand       100
Reserved       15
Available      85


---

8. POS

POS should be a frontend over the same commerce engine.

POS
│
├── Barcode Scanner
├── Product Search
├── Cart
├── Customer
├── Discount
├── Tax
├── Payment
├── Receipt
└── Returns

Scanner:

Scan
 ↓
Barcode lookup
 ↓
Product
 ↓
Add to cart
 ↓
Checkout
 ↓
Payment
 ↓
Order
 ↓
Inventory transaction
 ↓
Accounting journal

This gives you a single transaction flow.


---

9. Ecommerce

Your online store becomes another client of the same backend.

Next.js Storefront
        │
        ▼
Commerce API
        │
        ▼
Product
        │
        ├── Pricing
        ├── Inventory
        ├── Promotion
        └── Tax

The website should never maintain its own independent product database.


---

10. Subscription system

Subscriptions should be built around:

SubscriptionPlan
Subscription
SubscriptionItem
SubscriptionCycle
SubscriptionInvoice
SubscriptionPayment

Example:

Business Plan
₹999/month

Customer subscribes
       ↓
Subscription created
       ↓
Billing cycle
       ↓
Invoice
       ↓
Payment
       ↓
Renewal

Support:

Monthly
Quarterly
Half-yearly
Annual
Custom interval
Trial
Discount
Coupon
Upgrade
Downgrade
Pause
Resume
Cancel
Proration


---

11. Digital products

Digital products should use:

Product
   │
   ▼
DigitalProduct
   │
   ▼
DigitalAsset
   │
   ▼
Entitlement

Example:

Customer purchases:
"Accounting Course"

Order
 ↓
Payment
 ↓
Entitlement
 ↓
Customer gets access

This is better than simply giving the customer a download URL.


---

12. Services

Services should use:

ServiceProduct
      │
      ▼
ServiceBooking
      │
      ▼
Appointment
      │
      ▼
Order
      │
      ▼
Invoice

Examples:

Consultation
Salon appointment
Repair
Installation
Training
Professional service

The service can be sold through:

POS
Online
Marketplace
Mobile
API


---

13. Marketplace

Marketplace requires an additional layer:

Platform
│
├── Seller
│
├── SellerStore
│
├── SellerProduct
│
├── SellerInventory
│
├── SellerOrder
│
├── Commission
│
├── Settlement
│
└── Payout

The important distinction:

Platform Product

versus:

Seller Listing

One product can potentially have multiple sellers.

Product
   │
   ├── Seller A Listing
   ├── Seller B Listing
   └── Seller C Listing


---

14. Marketplace commission

Example:

Product price       ₹1,000
Platform commission    ₹100
Payment fee             ₹20
Tax/adjustments          ...
Seller settlement       ...

Don't calculate this only when displaying the dashboard.

Create immutable financial records.


---

15. Accounting integration

This is where I would strongly recommend an internal double-entry ledger even if you later integrate with external accounting software.

Core entities:

ChartOfAccount
Account
Journal
JournalEntry
LedgerEntry
AccountingPeriod
TaxTransaction

Example sale:

Dr Cash / Receivable
       Cr Sales Revenue

Dr COGS
       Cr Inventory

Dr Tax Receivable/Payable
       Cr GST Liability

The exact accounts depend on the transaction and jurisdiction.


---

16. Accounting adapters

Then integrate external systems through adapters:

AccountingEngine
       │
       ├── Internal Ledger
       │
       ├── Tally Adapter
       ├── Zoho Books Adapter
       ├── QuickBooks Adapter
       └── Other Adapter

This is far better than coupling your Order service directly to one accounting vendor.


---

17. Payment architecture

Likewise:

Payment
   │
   ├── Razorpay
   ├── PayU
   ├── Easebuzz
   ├── Stripe
   └── Cash

Use:

PaymentProvider
PaymentIntent
PaymentAttempt
PaymentTransaction
Refund
Settlement

Then your business logic doesn't care which gateway processed the payment.


---

18. Unified financial flow

The ultimate transaction should look like:

CUSTOMER
                       │
                       ▼
                  ORDER CREATED
                       │
                       ▼
                PRICE CALCULATION
                       │
                       ▼
                  TAX CALCULATION
                       │
                       ▼
                 INVENTORY RESERVE
                       │
                       ▼
                   PAYMENT
                       │
                       ▼
                  ORDER CONFIRMED
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
       FULFILLMENT           ACCOUNTING
             │                   │
             ▼                   ▼
        INVENTORY             JOURNAL
          UPDATE                │
             │                  ▼
             │               LEDGER
             ▼
         COMPLETED

That's the backbone.


---

19. SQLite + Prisma consideration

For the first deployment, SQLite + Prisma is perfectly reasonable for:

Single-store
Small/medium merchant
Local POS
Offline-first POS
Development
MVP
Small ecommerce

But your architecture should keep the data access layer portable.

Use:

Repository
Service
Domain

rather than scattering:

prisma.product.findMany()

through React components.

For example:

ProductRepository
OrderRepository
InventoryRepository
PaymentRepository
AccountingRepository

Then you can later move from:

SQLite

to:

PostgreSQL

without rewriting your entire business layer.


---

20. Recommended monorepo structure

For the size of platform you're describing:

apps/
│
├── admin/
├── storefront/
├── pos/
├── seller/
└── mobile/
    
packages/
│
├── database/
├── auth/
├── products/
├── barcode/
├── inventory/
├── orders/
├── pricing/
├── payments/
├── billing/
├── subscriptions/
├── digital/
├── services/
├── marketplace/
├── accounting/
├── tax/
├── shipping/
├── notifications/
└── shared/

If you're keeping a single Next.js application initially:

src/
├── app/
├── modules/
│   ├── catalogue/
│   ├── barcode/
│   ├── inventory/
│   ├── pos/
│   ├── ecommerce/
│   ├── orders/
│   ├── billing/
│   ├── subscriptions/
│   ├── digital/
│   ├── services/
│   ├── marketplace/
│   └── accounting/
├── lib/
├── server/
└── prisma/

Start modular monolith first; split into services only when scale or organizational boundaries justify it.


---

21. Final domain model

Your platform should eventually resemble:

┌─────────────┐
                         │   CUSTOMER  │
                         └──────┬──────┘
                                │
                                ▼
┌───────────┐              ┌──────────┐
│ STOREFRONT│─────────────▶│   ORDER  │◀──────────┐
└───────────┘              └────┬─────┘           │
                                │                 │
┌───────────┐                   │            ┌────┴────┐
│    POS    │───────────────────┘            │MARKETPLACE│
└───────────┘                                └─────────┘
                                │
                ┌───────────────┼────────────────┐
                ▼               ▼                ▼
           INVENTORY         PAYMENT          BILLING
                │               │                │
                ▼               ▼                ▼
           PROCUREMENT     GATEWAY          SUBSCRIPTION
                │                                │
                └────────────┬───────────────────┘
                             ▼
                        ACCOUNTING
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
                 LEDGER              TAX

And underneath all of it:

PRODUCT
                            │
       ┌──────────┬─────────┼─────────┬───────────┐
       ▼          ▼         ▼         ▼           ▼
    Physical   Digital   Service  Subscription  Bundle
       │
       ├── Barcode
       ├── Variant
       ├── Batch
       ├── Serial
       ├── Inventory
       ├── Pricing
       ├── Tax
       ├── Media
       ├── SEO
       ├── Shipping
       └── Channels

The implementation order I recommend

Phase 1 — Foundation

Organization → Users/RBAC → Customer → Product → Category → Brand → Unit → Barcode

Phase 2 — Inventory

Warehouse → Location → Stock → Batch → Serial → Transfers → Adjustments → Purchase

Phase 3 — Commerce

Cart → Pricing → Tax → Order → Payment → Invoice → Returns → Refund

Phase 4 — POS

Scanner → Fast Product Add → POS Cart → Cash/Card/UPI → Receipt → Offline queue

Phase 5 — Ecommerce

Storefront → Search → Product pages → Checkout → Shipping → Customer account

Phase 6 — Advanced products

Digital → Services → Subscriptions → Bundles → Kits → Rentals → Gift Cards

Phase 7 — Marketplace

Seller → Seller listing → Commission → Seller order → Settlement → Payout

Phase 8 — Accounting

Chart of Accounts → Double-entry ledger → GST → Reconciliation → Tally/Zoho/QuickBooks adapters

Phase 9 — Automation

Webhooks → Events → Background jobs → Notifications → Scheduled billing → Reconciliation → Reporting

That sequence prevents you from building eight disconnected systems. The Product → Order → Payment → Inventory → Accounting chain becomes the central backbone, while POS, ecommerce, marketplace, subscriptions, digital products and services become different ways of using the same underlying commerce engine.

