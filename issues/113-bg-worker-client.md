# Ticket 113-bg-worker-client

Status: done
Labels: feature

- [x] Organized storage: products/{id}/{slug}-{ts}.ext locally, mirrored R2 keys.
- [x] Client WASM worker (Next bundled) processes the queue on-device-browser; result POST swaps DB.
- [x] First-writer-wins guard between client worker and Inngest job.
- [x] Smoke swap path live, chain, release.
