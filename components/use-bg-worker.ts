"use client";

import { useState } from "react";

// Browser-first background removal (same pattern as the barcode/QR WASM
// scanners): enqueue the server job, then run the imgly WASM worker right
// here in the page. Whoever finishes first wins the swap; the server never
// blocks on runtimes that cannot run ONNX.
export function useBgWorker() {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [note, setNote] = useState("");

  async function run(imageUrl: string, assetId: number, productId = 0): Promise<boolean> {
    setBusyId(assetId);
    setNote("Starting…");
    try {
      const q = await fetch("/api/media/bgremove", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, productId }),
      }).then((r) => r.json()).catch(() => null);
      if (!q?.ok) {
        setNote("Could not start.");
        setBusyId(null);
        return false;
      }
      const jobId = q.id as number;
      setNote("Removing background on this device…");
      try {
      const worker = new Worker("/bg-worker.mjs", { type: "module" });
        const done = await new Promise<boolean>((resolve) => {
          worker.onmessage = async (e: MessageEvent<{ ok: boolean; jobId: number; bytes?: ArrayBuffer }>) => {
            try {
              if (e.data?.ok && e.data.bytes) {
                const form = new FormData();
                form.append("jobId", String(e.data.jobId));
                form.append("file", new Blob([e.data.bytes], { type: "image/png" }), "nobg.png");
                const r = await fetch("/api/media/bgdone", { method: "POST", body: form });
                resolve(r.ok);
              } else resolve(false);
            } catch { resolve(false); }
            worker.terminate();
          };
          worker.onerror = () => { worker.terminate(); resolve(false); };
          worker.postMessage({ imageUrl, jobId });
        });
        if (done) {
          setNote("Transparent ✓");
          setBusyId(null);
          return true;
        }
      } catch { /* fall through to polling */ }
      // Worker unavailable/failed: poll in case the server won instead.
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const d = await fetch(`/api/media/bgremove?id=${jobId}`).then((r) => r.json()).catch(() => null);
        if (d?.status === "done") {
          setNote("Transparent ✓");
          setBusyId(null);
          return true;
        }
      }
      setNote("Still working — check back soon.");
      setBusyId(null);
      return false;
    } catch {
      setNote("Could not start.");
      setBusyId(null);
      return false;
    }
  }

  return { run, busyId, note, setNote };
}
