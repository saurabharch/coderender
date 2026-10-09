# Wayfinder map: PDF bill themes

Labels: wayfinder:map
Status: done

## Destination

Downloadable PDF bills on current infra: tax invoice (A4) + receipt in
Modern/Minimal themes via pdf-lib, served from existing bill data. Done
when a real bill downloads byte-valid with chain green and CI green.

## Notes

- Engine decision: `pdf-lib` 1.17.1 (pure JS, installs with npm on-device,
  runs in CI; no Canvas/native deps). Verified present on the registry.
- Domain: builds on `invoiceForOrder`/`receiptForPayment` data + business
  profile + HSN work (ticket 176); no new data layer.
- Skills every session: `implement` + `tdd`; `code-review` before release.
- Constraints: npm on-device (postinstall approvals as needed); never
  `pm2 restart` on red build; probe cleanup.

## Decisions so far

- [PDF tax invoice + receipt themes](189-pdf-bill-themes.md): pdf-lib renderer + gated downloads, byte-proved live.

## Not yet specified

- Email-attach + storage pipeline (needs R2/keys — absent).
- Label-sheet PDF.

## Out of scope

- Headless-Chrome rendering (unbuildable here); jspdf/Canvas engines.
- Verbatim third-party templates.

## Children

- [PDF tax invoice + receipt themes](189-pdf-bill-themes.md) — done
- [Thermal receipt PDF variant](194-thermal-receipt-pdf.md) — done (roll widths + wrap byte-proved)
