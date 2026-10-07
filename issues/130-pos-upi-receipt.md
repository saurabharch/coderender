# Ticket 130-pos-upi-receipt

Status: done
Labels: feature, pos, print

Manual-confirm UPI + printable bill (CRN + tracking barcode).

- [x] retail-core: receiptNo() pure + test; receipt API (order+lines+business).
- [x] POS: UPI collect panel (business VPA QR + amount; missing-VPA guidance).
- [x] POS: receipt view (business, CRN, barcode, items, subtotal/discount/tax,
      method remark, change) + receipt-only print + new sale.
- [x] Chain green + live UPI + cash sale + reprint verify + release.
