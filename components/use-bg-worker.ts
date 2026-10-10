"use client";

import { useState } from "react";

// Browser-first background removal (same pattern as the barcode/QR WASM
// scanners): enqueue the server job, then run the imgly WASM worker right
// here in the page. Whoever finishes first wins the swap; the server never
// blocks on runtimes that cannot run ONNX.
//
// Universal-device chain per attempt:
//  1. module worker (/bg-worker.mjs, small model + progress) — background
//  2. main-thread fallback (local bundle) — browsers without module workers
//  3. server poll (Linux/prod runtimes CAN run ONNX) — then honest note.
// Engine internals never reach the UI; the original image is always kept.
type WorkerMsg = {
  ok?: boolean; progress?: boolean; jobId: number; bytes?: ArrayBuffer;
  key?: string; done?: number; total?: number; error?: string;
};

async function mainThread(imageUrl: string, onPct: (p: number) => void): Promise<ArrayBuffer | null> {
  try {
    onPct(5);
    // CDN runtime import (webpackIgnore): zero build/bundle cost on-device —
    // same pinned ESM the background worker uses. No onnx in our chunks.
    const ESM_URL = "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm";
    const { removeBackground } = (await import(/* webpackIgnore: true */ ESM_URL)) as typeof import("@imgly/background-removal");
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    const out = await removeBackground(blob, {
      model: "isnet_quint8",
      device: "cpu",
      progress: (_key: string, cur: number, total: number) => {
        if (total > 0) onPct(Math.min(95, Math.round((cur / total) * 100)));
      },
    });
    onPct(95);
    const buf = await out.arrayBuffer();
    return buf.byteLength >= 1024 ? buf : null;
  } catch {
    return null;
  }
}

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

      // --- path 1: background module worker (preferred, non-blocking) ---
      try {
        if (typeof Worker !== "undefined") {
          const worker = new Worker("/bg-worker.mjs", { type: "module" });
          const done = await new Promise<boolean>((resolve) => {
            let settled = false;
            const finish = (v: boolean) => { if (!settled) { settled = true; resolve(v); } };
            // Progress-aware watchdog: 90s without any message = stuck.
            let timer = setTimeout(() => { try { worker.terminate(); } catch { /* ignore */ } finish(false); }, 90000);
            const poke = () => {
              clearTimeout(timer);
              timer = setTimeout(() => { try { worker.terminate(); } catch { /* ignore */ } finish(false); }, 90000);
            };
            // Absolute cap: even slow model downloads settle by 10 min.
            const cap = setTimeout(() => { try { worker.terminate(); } catch { /* ignore */ } finish(false); }, 600000);
            worker.onmessage = async (e: MessageEvent<WorkerMsg>) => {
              poke();
              const d = e.data;
              if (d?.progress) {
                const pct = d.total && d.total > 0 ? Math.min(95, Math.round(((d.done ?? 0) / d.total) * 100)) : 0;
                setNote(`Downloading engine… ${pct}% (once per device)`);
                return; // NOT final — keep waiting.
              }
              try {
                if (d?.ok && d.bytes) {
                  const form = new FormData();
                  form.append("jobId", String(d.jobId));
                  form.append("file", new Blob([d.bytes], { type: "image/png" }), "nobg.png");
                  const r = await fetch("/api/media/bgdone", { method: "POST", body: form });
                  clearTimeout(timer);
                  clearTimeout(cap);
                  worker.terminate();
                  finish(r.ok);
                  return;
                }
                setNote(d?.error ? `${d.error}.` : "Could not process on this device.");
              } catch { /* fall to next path */ }
              clearTimeout(timer);
              clearTimeout(cap);
              worker.terminate();
              finish(false);
            };
            worker.onerror = () => {
              clearTimeout(timer);
              clearTimeout(cap);
              try { worker.terminate(); } catch { /* ignore */ }
              finish(false);
            };
            try {
              worker.postMessage({ imageUrl, jobId });
            } catch {
              clearTimeout(timer);
              clearTimeout(cap);
              finish(false);
            }
          });
          if (done) {
            setNote("Transparent ✓");
            setBusyId(null);
            return true;
          }
        }
      } catch { /* fall through to main-thread */ }

      // --- path 2: main-thread fallback (no module-worker support) ---
      setNote("Trying on-page engine…");
      const bytes = await mainThread(imageUrl, (p) => setNote(`Processing… ${p}%`));
      if (bytes) {
        try {
          const form = new FormData();
          form.append("jobId", String(jobId));
          form.append("file", new Blob([bytes], { type: "image/png" }), "nobg.png");
          const r = await fetch("/api/media/bgdone", { method: "POST", body: form });
          if (r.ok) {
            setNote("Transparent ✓");
            setBusyId(null);
            return true;
          }
        } catch { /* fall to poll */ }
      }

      // --- path 3: poll in case the server won instead (Linux/prod runs
      // ONNX fine) — then honest note, original kept. ---
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const d = await fetch(`/api/media/bgremove?id=${jobId}`).then((r) => r.json()).catch(() => null);
        if (d?.status === "done") {
          setNote("Transparent ✓");
          setBusyId(null);
          return true;
        }
        if (d?.status === "failed") break;
      }
      setNote("Still working — original kept. Check back soon.");
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
