// Static module worker for background removal (served from /public, NOT
// bundled — Next emits the import.meta.url pattern as a loader stub that
// cannot run as a worker in production builds). Runs @imgly/background-removal
// (WASM) on-device in the browser, like the barcode/QR scanners. Pinned to
// the version vendored in package.json. No secrets here.
import { removeBackground } from "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm";

let busy = false;

self.onmessage = async (e) => {
  if (busy) return;
  busy = true;
  try {
    const { imageUrl, jobId } = e.data ?? {};
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const blob = await res.blob();
    const out = await removeBackground(blob);
    const buf = await out.arrayBuffer();
    self.postMessage({ ok: true, jobId, bytes: buf }, [buf]);
  } catch (err) {
    self.postMessage({
      ok: false,
      jobId: (e.data ?? {}).jobId ?? 0,
      error: err instanceof Error ? err.message : "worker failed",
    });
  } finally {
    busy = false;
  }
};
