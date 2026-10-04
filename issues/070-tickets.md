# Support tickets end-to-end (070)

Status: done
Labels: feature

## Question
Tickets have no console, timeline, resolution, abuse layer, attachments,
auto-status, agent access, or loop notifications.

## Done when
- Tickets console (sidebar Tickets, detail with timeline, assign,
  resolve, status) + watchers; abuse verdicts stored (spam auto-hide).
- Attachments quarantined until scanned (ClamAV when present, else
  EICAR+heuristic, backend recorded) via inngest scan job.
- SLA auto-status (settings-adjustable) in scheduler tick.
- Bot files/lists/resolves tickets; agent ops ticket.* audited.
- Loop notifications (mail/push/wa-link/telegram-hook) on
  register/resolve/status change.
- README refreshed (features, mindmap, flow, config); chain green.
