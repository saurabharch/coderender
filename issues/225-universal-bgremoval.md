# Ticket: Universal browser bg removal (all devices)

Parent: [Ticket: Locale hint honesty + imgly-only bg removal](223-locale-hint-bgremoval.md)
Labels: wayfinder:task
Status: done
Assignee: opencode

## Question

How does background removal work on every device browser — old and new,
Android and iPhone, fast and slow networks — without ever surfacing the
engine's scary `Failed to create session / blob:` internals?

## Constraints

- Browser-first like the barcode/QR WASM scanner (heavy lifting on-device,
  background thread, honest phased UI). Server never prints engine errors.
- Smallest model (`small` + `cpu`) so cheap phones survive; progress shown
  while the model downloads; module-worker-unsupported browsers fall back
  to main-thread, then to server-side where the runtime allows, then to an
  honest retry note. Original image always kept.
- Inngest treats "deferred to browser" as success, not failure.
- Why not vendored like `/wasm`: the scanner ships 2 tiny files; the
  removal model is tens of MB versioned by imgly and HTTP-cached — CDN is
  the correct call here, documented not hidden.

## Resolution

Browser-first chain everywhere (shop + media library share the protocol):
1. background module worker (`/bg-worker.mjs`, smallest `isnet_quint8` +
   cpu for cheap phones/iOS, download progress posts) — non-blocking;
2. main-thread fallback via CDN runtime import (`webpackIgnore`, zero
   bundle cost) for browsers without module workers;
3. server poll (Linux/prod CAN run ONNX) — then an honest note.
- Progress posts are hints, never final (shop-console used to settle on
  ANY message — fixed to ignore progress). Progress-aware watchdog (90s
  idle) + 10-min absolute cap; engine internals mapped to friendly codes,
  never surfaced. Inngest treats browser-deferred as success; only
  permanent failures (asset/R2 gone) throw. Original always kept.
- Build lesson: static `import("@imgly/background-removal")` in client
  code pulls onnxruntime-web into the chunk graph and OOM-kills the
  on-device build (died silently mid-compile); the CDN runtime import
  keeps builds green. Scanner comparison documented in the ticket: CDN is
  correct here (tens-of-MB versioned model, HTTP-cached) vs `/wasm`
  vendoring for the scanner's 2 tiny files.
Live proof: job lands `queued / browser handles it` instantly; new phased
strings + BG button present in served chunks; jobs table left with zero
scary notes (stale pre-fix orphan row removed after verifying its asset
was already gone); probes cleaned by captured ids. Worker served 200 as
application/javascript, syntax-checked.
