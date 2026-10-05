# Ticket 089b-retail-bugs (bugfix, from pre-Phase-F log audit)

Status: done
Labels: bugfix

From production error-log triage (242 errors classified):
- P0 mailer: no-SMTP path hard-required Ethereal (4 ENOTFOUND crashes → login/OTP/notifications dead when unreachable). Now stream-transport log fallback; normal path re-verified.
- P1 /r/[code]: malformed Host header → Invalid URL 500. Now APP_URL fallback redirect.
- Triaged, no action: null-prototype board crashes (62, historical — getBoard already deep-plains), missing-.next boot errors (old deploy incident), stale .next chunks on redeploy (transient, refresh fixes).
- DB: zero orphans/negatives/phantoms across commerce tables.
