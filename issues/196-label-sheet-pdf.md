# Ticket: A4 label-sheet PDF

Parent: [Wayfinder map: Label-sheet PDF](195-label-sheet-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How do queued/single label runs render as A4-sheet PDFs (preset sizes,
name, price, QR, bars) from studio settings?

## Constraints

- Same pdf-lib family; QR via PNG embed, bars via drawn rects from the
  existing EAN pattern math (no new barcode engine).
- Layout honors sticker preset sizes + cols/rows math from the studio.
- Byte-valid output proven live (magic + pages + sticker count spot-check).

## Resolution

A4 label sheets from studio runs, same pdf-lib family:
- `lib/pdf-labels.ts`: data-in/bytes-out, preset sizes + studio grid math,
  name/price/QR (PNG embed)/bars (rects from existing EAN patterns),
  validated settings only.
- Team-gated sheet endpoint + "PDF sheet" button (batch or single run).
Live proof: 2-item mixed run → 200 application/pdf, %PDF- magic, 1 A4 page.
Probe tokens cleaned (no data rows written by this feature).
