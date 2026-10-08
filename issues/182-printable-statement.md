# Ticket: Printable customer statement

Parent: [Wayfinder map: Credit depth (reminders + statements)](180-credit-depth-map.md)
Labels: wayfinder:task
Status: brief
Blocked-by: (none — frontier)

## Question

How does a customer dues statement render for print/share — header, dues,
terms/overdue status, timeline — reusing the receipt print-CSS pattern?

## Constraints

- Read-only over `udhariStatement` data (profile + credit orders + events).
- Thermal-friendly like the POS receipt; share = print-to-PDF via dialog
  (no PDF engine on-device).
