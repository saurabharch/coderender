# Ticket: A4 label-sheet PDF

Parent: [Wayfinder map: Label-sheet PDF](195-label-sheet-map.md)
Labels: wayfinder:task
Status: brief
Blocked-by: (none — frontier)

## Question

How do queued/single label runs render as A4-sheet PDFs (preset sizes,
name, price, QR, bars) from studio settings?

## Constraints

- Same pdf-lib family; QR via PNG embed, bars via drawn rects from the
  existing EAN pattern math (no new barcode engine).
- Layout honors sticker preset sizes + cols/rows math from the studio.
- Byte-valid output proven live (magic + pages + sticker count spot-check).
