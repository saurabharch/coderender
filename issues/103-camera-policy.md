# Ticket 103-camera-policy

Status: done
Labels: bugfix, security

Root cause of "never asks for camera permission": global
`Permissions-Policy: camera=()` (empty allowlist) disables camera for our OWN
pages too — the browser denies getUserMedia outright without prompting.
Service worker is push-only and uninvolved (verified: no fetch handler).
Fix: `camera=(self)` — own pages can request, third-party iframes still blocked.
