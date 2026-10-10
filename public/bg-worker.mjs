// Static module worker for background removal (served from /public, NOT
// bundled — Next emits the import.meta.url pattern as a loader stub that
// cannot run as a worker in production builds). Runs @imgly/background-removal
// (WASM) on-device in the browser, like the barcode/QR scanners. Pinned to
// the version vendored in package.json. No secrets here.
//
// Universal-device choices (unlike the scanner's 2 tiny vendored files, the
// removal model is tens of MB versioned by imgly and HTTP-cached, so CDN is
// the correct call — vendoring would bloat every deploy):
// - smallest model ("small") + cpu: survives cheap Android phones and iOS
//   Safari memory limits; quality is plenty for product cutouts.
// - progress posts keep the UI honest during the one-time model download.
// - errors are mapped to friendly codes; onnx/blob internals never leak.
import { removeBackground } from "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm";

let busy = false;

function friendly(raw) {
  const m = String(raw || "");
  if (/fetch|network|failed to fetch|load failed|download/i.test(m)) return "download failed — check connection and retry";
  if (/memory|allocation|arraybuffer|wasm memory/i.test(m)) return "photo too large for this device — use a smaller photo";
  if (/webgl|webgpu|gpu|backend|session/i.test(m)) return "engine unavailable here — retry on Chrome/Safari latest";
  if (/empty result/i.test(m)) return "no subject found — try a clearer photo";
  return "could not process — retry or keep the original";
}

self.onmessage = async (e) => {
  if (busy) return;
  busy = true;
  const jobId = (e.data ?? {}).jobId ?? 0;
  try {
    const { imageUrl } = e.data ?? {};
    if (!imageUrl) throw new Error("no image");
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const blob = await res.blob();
    const out = await removeBackground(blob, {
      model: "isnet_quint8",
      device: "cpu",
      progress: (key, current, total) => {
        try {
          self.postMessage({ progress: true, jobId, key, done: current, total });
        } catch { /* UI hint only */ }
      },
    });
    const buf = await out.arrayBuffer();
    if (buf.byteLength < 1024) throw new Error("empty result");
    self.postMessage({ ok: true, jobId, bytes: buf }, [buf]);
  } catch (err) {
    self.postMessage({
      ok: false,
      jobId,
      error: friendly(err instanceof Error ? err.message : err),
    });
  } finally {
    busy = false;
  }
};
