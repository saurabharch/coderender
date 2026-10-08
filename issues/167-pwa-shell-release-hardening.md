# Ticket: PWA shell + release hardening

Parent: [Wayfinder map: POS advance on current infra](163-pos-advance-map.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

What makes the web app installable + offline-shelled (SW precache, manifest
proof) and the local release path (`ci.sh` → `deploy.sh` → pm2 → Cloudflare
verify) trustworthy for every release?

## Decision needed

- SW scope: shell precache without breaking `next start` freshness.
- Release checklist as code vs docs; tunnel health assertion staying green.


Resolution: SW upgraded to versioned shell (network-first navigations + /offline fallback, cache-first framework assets, APIs passthrough) + new /offline page; deploy.sh now builds before reload (was missing); release.sh enforces the full gate. Live: sw/offline/manifest all 200 with new handler in served worker.
