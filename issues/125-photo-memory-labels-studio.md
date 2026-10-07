# Ticket 125-photo-memory + labels-studio

Status: done
Labels: bugfix, print, ux

- [x] Photo OOM: single-step decode ladder (full → 1280 → 800), 1280px/0.8
      target, staged error messages, bitmap always closed.
- [x] Rename Shop → Inventory in admin labels only (drawer + page head);
      routes/URLs unchanged.
- [x] Label studio: paper presets (roll/A4/custom) + dims/gaps/padding,
      copies → sheet grid fill, content toggles (name/id/price/MRP/barcode/
      QR/SKU/batch), settings tab persisted per-device, print-only CSS with
      dynamic @page, preview == print grid, responsive.
- [x] Chain green + live verify + release.
