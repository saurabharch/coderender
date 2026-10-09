# Ticket: PDF tax invoice + receipt themes

Parent: [Wayfinder map: PDF bill themes](188-pdf-themes-map.md)
Labels: wayfinder:task
Status: brief
Blocked-by: (none — frontier)

## Question

How do tax invoices (A4) and receipts download as real PDFs in Modern and
Minimal themes from existing bill data?

## Constraints

- `pdf-lib` only; standard fonts (no font embedding downloads).
- Byte-valid output verified live (magic bytes + page count), not just 200.
- Download endpoint gated like the bill views; HSN + composition note
  carried from ticket 176 work.
