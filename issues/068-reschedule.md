# Meeting reschedule + multi-channel notify (068)

Status: done
Labels: feature

## Question
Meetings can't be rescheduled; no participant notifications; bot can't
reschedule.

## Done when
- Team reschedule (slot/status) via UI + API; notifies involved only:
  mail (client if email + owners), push (label-matched subs),
  WhatsApp/Telegram provider hooks with wa.me + Notification fallback.
- Bot reschedule flow for verified support/partner (pick → slot → confirm).
- Shared slot generator; chain green + smoke.
