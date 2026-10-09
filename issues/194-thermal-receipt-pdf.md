# Ticket: Thermal receipt PDF variant

Parent: [Wayfinder map: PDF bill themes](188-pdf-themes-map.md)
Labels: wayfinder:task
Status: brief
Blocked-by: (none — frontier)

## Question

How does the POS receipt download as a narrow-roll PDF (58/72/80mm,
honoring `receipt_width`) from the same receipt data and brand kit?

## Constraints

- Same `pdf-lib` renderer family; roll width = custom page size, content
  reflows to one column; logo + composition note carried.
- Byte-valid output proven live like the A4 themes.
