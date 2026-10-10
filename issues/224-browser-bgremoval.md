# Ticket: Browser-first bg removal, quiet server skip

Parent: [Wayfinder map: Locale hint honesty + imgly-only bg removal](223-locale-hint-bgremoval.md)
Labels: wayfinder:task
Status: done
Assignee: opencode
Blocked-by: (none — frontier)

## Question

How does background removal work on every device browser without the
server ever printing onnx/blob-loader errors?

## Constraints

- Server skips fast where the runtime cannot run it (clean note, no scary
  error, no long waits); browser WASM worker is the primary path, driven
  everywhere removal is offered (shop + media library).
- Same barcode/QR pattern: heavy lifting in browser WebAssembly.

## Resolution

Browser-first, same as barcode/QR scanners:
- Server skips fast on runtimes that cannot run ONNX (clean "browser
  handles it" note, no scary blob-loader errors, no long waits); bounded
  attempt remains elsewhere.
- Shared `useBgWorker` hook (enqueue → browser WASM → post → poll fallback);
  new BG button on every media-library image, not just shop uploads.
Live proof: job lands queued with the clean note instantly; worker bundle
present in served chunks. Probes cleaned by captured ids.
