# Ticket 112-bgremove-job

Status: done
Labels: feature

- [x] BgJob table + server worker (load → imgly remove → save -nobg → swap asset + product images → notify). Honest failure (original stays).
- [x] Inngest fn + runLocal("bgRemove"), enqueue endpoint (fire-and-forget).
- [x] Capture flow: upload original fast → enqueue → auto-swap message.
- [x] Live smoke (job completes, DB swapped), chain, release.
