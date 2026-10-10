# Ticket: Locale hint honesty + imgly-only bg removal

Labels: wayfinder:task
Status: done
Assignee: opencode

## Question

Why does the site feel stuck in Hindi, and how does background removal run
without ClipDrop?

## Findings

- Geo hint was applied as a setting (every IN visit re-forced Hindi).
  Fixed: site default always renders; a one-time dismissible pill suggests
  Hindi only when geo disagrees and nothing is remembered.
- ClipDrop branch removed (vault field + provider test updated); imgly is
  the single engine with a 20s/120s timeout guard so jobs requeue for the
  browser worker instead of wedging in "working" (proven live).

- [Browser-first bg removal, quiet server skip](224-browser-bgremoval.md): clean skip + shared hook + gallery button, live-proved.
- [Universal browser bg removal (all devices)](225-universal-bgremoval.md): small-model worker + progress + main-thread/CDN fallback + quiet Inngest defer, live-proved.
