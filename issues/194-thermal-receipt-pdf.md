# Ticket: Thermal receipt PDF variant

Parent: [Wayfinder map: PDF bill themes](188-pdf-themes-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How does the POS receipt download as a narrow-roll PDF (58/72/80mm,
honoring `receipt_width`) from the same receipt data and brand kit?

## Constraints

- Same `pdf-lib` renderer family; roll width = custom page size, content
  reflows to one column; logo + composition note carried.
- Byte-valid output proven live like the A4 themes.

## Resolution

Narrow-roll PDFs from the same renderer family:
- `renderBillPdf` takes `rollMm` (58|72|80): custom page width, word-wrap
  to the measure (pure + tested), same themes/logo/composition content.
- Route `?roll=` param + Roll 58/72/80 buttons on the billing doc page.
Live proof: 58mm roll → 200 application/pdf, %PDF- magic, page exactly
164pt wide, long title wrapped without breaking. Probe rows cleaned.
