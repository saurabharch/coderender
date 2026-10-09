# Ticket: PDF tax invoice + receipt themes

Parent: [Wayfinder map: PDF bill themes](188-pdf-themes-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How do tax invoices (A4) and receipts download as real PDFs in Modern and
Minimal themes from existing bill data?

## Constraints

- `pdf-lib` only; standard fonts (no font embedding downloads).
- Byte-valid output verified live (magic bytes + page count), not just 200.
- Download endpoint gated like the bill views; HSN + composition note
  carried from ticket 176 work.

## Resolution

Server PDFs via pdf-lib (pure JS, installs clean on-device):
- `lib/pdf-bill.ts`: data-in/bytes-out renderer, A4, Modern (brand bar) +
  Minimal themes, standard fonts only, WinAnsi sanitizer (₹→Rs. etc. so no
  business text can break the render), pagination past one page.
- Team-gated download route with theme param + Modern/Minimal buttons on
  the billing doc page.
Live proof: real invoice both themes → 200 application/pdf, %PDF- magic,
1 page each, ~1.6KB. Probe rows cleaned.
