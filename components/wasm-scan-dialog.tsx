"use client";

import { useEffect, useRef, useState } from "react";

// ZBar-via-WASM scanner (eringen/web-wasm-barcode-reader): works anywhere the
// native BarcodeDetector is missing (notably iOS Safari) and brings its own
// overlay, beep and torch. WASM assets ship from /wasm (vendored, offline-safe).
export function WasmScanDialog({ open, onClose, onScan, title = "Scan barcode" }: {
  open: boolean; onClose: () => void; onScan: (data: string, symbol: string) => void; title?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<{ stop: () => void; toggleTorch: () => Promise<boolean> } | null>(null);
  const coolRef = useRef(false);
  const [err, setErr] = useState("");
  const [torch, setTorch] = useState(false);

  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!open) return;
    let dead = false;
    setErr("");
    (async () => {
      try {
        const { BarcodeScanner } = await import("web-wasm-barcode-reader");
        if (dead || !mountRef.current) return;
        const scanner = new BarcodeScanner({
          container: mountRef.current,
          wasmPath: "/wasm/",
          beepOnDetect: true,
          scanInterval: 200,
          onDetect: (r) => {
            if (dead || coolRef.current) return;
            coolRef.current = true;
            setTimeout(() => { coolRef.current = false; }, 1500);
            onScanRef.current(r.data, r.symbol);
          },
          onError: (e) => {
            if (!dead) setErr(e.message || "Scanner failed — check camera permission and HTTPS.");
          },
        });
        scannerRef.current = scanner;
        await scanner.start();
      } catch (e) {
        if (!dead) setErr(e instanceof Error ? e.message : "Could not start the scanner.");
      }
    })();
    return () => {
      dead = true;
      try { scannerRef.current?.stop(); } catch { /* ignore */ }
      scannerRef.current = null;
    };
  }, [open ]);

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={title}
      className="fixed inset-0 z-[90] flex flex-col bg-black">
      <div className="flex min-h-[56px] items-center justify-between px-4 text-white">
        <button onClick={onClose} aria-label="Close scanner"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/15 text-xl">✕</button>
        <p className="text-sm font-bold tracking-wide">{title}</p>
        <button
          onClick={() => {
            scannerRef.current?.toggleTorch().then(setTorch).catch(() => setErr("Torch not available on this camera."));
          }}
          aria-pressed={torch}
          className={`min-h-[44px] rounded-full px-4 text-sm font-semibold ${torch ? "bg-amber-300 text-black" : "bg-white/15 text-white"}`}>
          {torch ? "🔦 on" : "🔦 off"}
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div ref={mountRef} className="absolute inset-0 [&>canvas]:absolute [&>canvas]:inset-0 [&>canvas]:h-full [&>canvas]:w-full [&>video]:absolute [&>video]:inset-0 [&>video]:h-full [&>video]:w-full [&>video]:object-cover" />
        {err ? (
          <p role="alert" className="absolute inset-x-4 top-1/3 rounded-2xl bg-red-600/90 p-4 text-center text-sm font-semibold text-white">{err}</p>
        ) : (
          <p className="pointer-events-none absolute inset-x-0 top-3 text-center text-sm font-medium text-white/90">Align the barcode inside the frame</p>
        )}
      </div>
      <div className="bg-black px-4 pb-6 pt-2">
        <p className="text-center text-xs text-white/60">WASM scan · EAN / UPC / Code128 / QR · beeps on read</p>
      </div>
    </div>
  );
}
