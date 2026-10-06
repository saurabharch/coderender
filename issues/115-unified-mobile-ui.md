# Ticket 115-unified-mobile-ui

Status: done
Labels: ux, mobile-first

- [x] All `Add` brand buttons -> Plus icon buttons (16 sites, aria-label preserved).
- [x] Every barcode scan trigger uses ScanBarcode icon (POS + shop batch/field, 48px black / 44px border variants).
- [x] Photo capture uses Camera icon; Labels uses Tag icon (no more emoji glyphs).
- [x] Form rows `flex` -> `flex-wrap`; text inputs `min-w-[140px] flex-1`, pickers `basis-full sm:basis-0` so 375px stacks to new lines instead of squeezing.
- [x] Dropdowns safe-view: pickers `max-h-[50vh] overscroll-contain`, `type=search` + autosuggest (product/customer/service).
- [x] Chain green: lint, typecheck, 93 tests, build; live-verified 6 admin pages 200 + product/variant/suggest round-trip.
