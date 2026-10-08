# Ticket: Udhari due reminders

Parent: [Wayfinder map: Credit depth (reminders + statements)](180-credit-depth-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How do overdue udhari balances trigger reminders through the existing
notify channels (WhatsApp/email fallback like `BillDoc` reminders), without
becoming spam?

## Constraints

- Only overdue balances (per `ageStatus` + terms); quiet hours + max-nudges
  caps like the bill flow; every nudge logged (ReminderLog-style).
- Reuses `reminderTick` patterns in `lib/vyapar.ts`; no new provider.

## Resolution

Overdue-only nudges on the bill-reminder rails:
- `udhariReminderTick` (7-day per-customer cooldown, shared ReminderLog
  with customerId leg, team Notification per send, WhatsApp-first + email
  fallback via existing providers).
- Same 9am IST window/day-gate as bill reminders + manual `remind` op +
  "Remind overdue" button on the dues card; pure message builder tested.
Live proof: tick selected the 10-day-overdue debtor and skipped the fresh
one (verified in DB); sent 0 honestly — no WhatsApp/SMTP providers are
keyed in this environment, so nothing could deliver. Delivery itself rides
the pre-existing bill-reminder send paths.
