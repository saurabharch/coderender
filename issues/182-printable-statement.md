# Ticket: Printable customer statement

Parent: [Wayfinder map: Credit depth (reminders + statements)](180-credit-depth-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How does a customer dues statement render for print/share — header, dues,
terms/overdue status, timeline — reusing the receipt print-CSS pattern?

## Constraints

- Read-only over `udhariStatement` data (profile + credit orders + events).
- Thermal-friendly like the POS receipt; share = print-to-PDF via dialog
  (no PDF engine on-device).

## Resolution

Read-only A4 statement over existing statement data:
- New `app/admin/customers/[id]/statement` page: business header, balance
  + terms/overdue status, credit-limit line, credit orders table, timeline,
  footer note; print CSS emits the sheet only; share via Print/PDF dialog
  (no PDF engine on-device, as ticket scoped).
- Linked from every dues row ("Statement" button).
Live proof on probe debtor (75000, 10d old, 7d terms): page 200 with
customer, Balance due, "overdue 3d", credit orders, timeline, A4 print CSS.
All probe rows cleaned.
