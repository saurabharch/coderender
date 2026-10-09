# Wayfinder map: Label-sheet PDF

Labels: wayfinder:map
Status: done

## Destination

Label runs as downloadable A4 PDFs: queued or single-product stickers with
name, price, QR, and bars — matching studio presets. Done when a mixed
sheet downloads byte-valid with chain green and CI green.

## Notes

- Domain: extends the studio (presets + paper engine) and batch queue;
  reuses the pdf-lib renderer family (no new engine).
- Skills every session: `implement` + `tdd`; `code-review` before release.
- Constraints: npm on-device; standard fonts only; probe cleanup.

## Decisions so far

- [A4 label-sheet PDF](196-label-sheet-pdf.md): studio grid + QR/bars as PDF, byte-proved live.

## Not yet specified

- Email-attach + storage pipeline (needs R2/keys — absent).

## Out of scope

- Raw printer protocols; visual drag-and-drop designer.

## Children

- [A4 label-sheet PDF](196-label-sheet-pdf.md) — done
