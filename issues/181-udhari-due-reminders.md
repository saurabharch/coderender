# Ticket: Udhari due reminders

Parent: [Wayfinder map: Credit depth (reminders + statements)](180-credit-depth-map.md)
Labels: wayfinder:task
Status: brief
Blocked-by: (none — frontier)

## Question

How do overdue udhari balances trigger reminders through the existing
notify channels (WhatsApp/email fallback like `BillDoc` reminders), without
becoming spam?

## Constraints

- Only overdue balances (per `ageStatus` + terms); quiet hours + max-nudges
  caps like the bill flow; every nudge logged (ReminderLog-style).
- Reuses `reminderTick` patterns in `lib/vyapar.ts`; no new provider.
