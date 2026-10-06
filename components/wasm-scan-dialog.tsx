"use client";

import { useEffect, useRef, useState } from "react";
import { useOrientation } from "@mantine/hooks";

// ZBar-via-WASM scanner (eringen/web-wasm-barcode-reader): works anywhere the
// native BarcodeDetector is missing (notably iOS Safari) and brings its own
// overlay, beep and torch. WASM assets ship from /wasm (vendored, offline-safe).
export function WasmScanDialog({ open, onClose, onScan, title = "Scan barcode" }: {
  open: boolean; onClose: () => void; onScan: (data: string, symbol: string) => void; title?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<{ stop: () => void; toggleTorch: () => Promise<boolean> } | null>(null);
  const coolRef = useRef(false);
  const [err, setErr] = useState("");
  const [torch, setTorch] = useState(false);
  // Preflight: diagnose camera blockers BEFORE getUserMedia so the user gets
  // the exact fix instead of a generic denial.
  const [phase, setPhase] = useState<"checking" | "guide" | "scan">("checking");
  const [guide, setGuide] = useState("");
  const [attempt, setAttempt] = useState(0);
  const { type: orientType } = useOrientation();

  useEffect(() => {
    if (!open) return;
    let dead = false;
    setErr("");
    setGuide("");
    setPhase("checking");
    (async () => {
      if (!window.isSecureContext) {
        if (!dead) {
          setGuide("Camera needs a secure page (HTTPS). You are on plain http:// or an IP address — open the https:// tunnel URL instead, then scan again.");
          setPhase("guide");
        }
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!dead) {
          setGuide("This browser (or in-app webview like WhatsApp/Instagram) blocks camera access entirely. Open this page in Chrome on Android or Safari on iPhone — or use Take photo below.");
          setPhase("guide");
        }
        return;
      }
      try {
        const perm = await navigator.permissions?.query({ name: "camera" as PermissionName }).catch(() => null);
        if (!dead && perm?.state === "denied") {
          setGuide("Camera is BLOCKED for this site (you tapped Deny before — Chrome will not ask again). Fix: tap the 🔒/ⓘ icon left of the address bar → Permissions → Camera → Allow → come back and tap Scan again. Or use Take photo below right now.");
          setPhase("guide");
          return;
        }
      } catch { /* Permissions API missing — try the camera directly */ }
      if (!dead) setPhase("scan");
    })();
    return () => { dead = true; };
  }, [open, attempt ]);

  // Start the WASM scanner once preflight passes.
  useEffect(() => {
    if (!open || phase !== "scan") return;    let dead = false;
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
            if (dead) return;
            const m = e.message || "";
            if (/denied|not allowed|permission/i.test(m)) {
              setGuide("Camera permission was denied just now. Allow it in the browser prompt — or tap the 🔒 icon → Permissions → Camera → Allow. Meanwhile Take photo below works without it.");
              setPhase("guide");
            } else setErr(m || "Scanner failed.");
          },
        });
        scannerRef.current = scanner;
        await scanner.start();
      } catch (e) {
        if (!dead) {
          setGuide(e instanceof Error ? e.message : "Could not start the scanner. Use Take photo below.");
          setPhase("guide");
        }
      }
    })();
    return () => {
      dead = true;
      try { scannerRef.current?.stop(); } catch { /* ignore */ }
      scannerRef.current = null;
    };
  }, [open, phase, attempt ]);

  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  // Photo fallback: native camera app (separate permission), decoded locally.
  async function photoScan(file: File | undefined, viaDetector = true) {
    if (!file) return;
    setErr("Reading photo…");
    try {
      let v = "";
      if (viaDetector && "BarcodeDetector" in window && window.BarcodeDetector) {
        const bmp = await createImageBitmap(file);
        const det = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"] });
        const found = await det.detect(bmp);
        bmp.close();
        v = found[0]?.rawValue || "";
      }
      if (!v) throw new Error("empty");
      onScanRef.current(v, "photo");
    } catch {
      setErr("No barcode found in that photo — try closer, steadier, better light.");
    }
    if (photoRef.current) photoRef.current.value = "";
  }

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
        {phase === "checking" && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">Checking camera…</p>
        )}
        {phase === "guide" && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center text-black">
              <p className="text-lg font-extrabold">📷 Camera blocked</p>
              <p className="mt-2 text-sm">{guide}</p>
              <ol className="mx-auto mt-3 max-w-xs space-y-1 text-left text-xs text-zinc-700">
                <li><b>1.</b> Tap <b>⋮ → Settings → Site settings → Camera</b> <i>or</i> the <b>🔒 icon</b> by the address bar → Permissions → Camera.</li>
                <li><b>2.</b> Set this site&apos;s Camera to <b>Allow</b>.</li>
                <li><b>3.</b> This billing page stays open — come back and tap <b>Retry camera</b>.</li>
              </ol>
              <button onClick={() => { setAttempt((a) => a + 1); }}
                className="mt-4 min-h-[48px] w-full rounded-xl bg-brand text-sm font-bold text-white">🔄 Retry camera</button>
              <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden"
                aria-label="Take a barcode photo"
                onChange={(e) => void photoScan(e.target.files?.[0])} />
              <button onClick={() => photoRef.current?.click()}
                className="mt-2 min-h-[44px] w-full rounded-xl border border-black/15 text-sm font-semibold">📸 Take barcode photo instead</button>
              <button onClick={onClose} className="mt-2 min-h-[44px] w-full rounded-xl text-sm font-semibold text-zinc-500">Back to billing</button>
            </div>
          </div>
        )}
        {phase === "scan" && (
          <div ref={mountRef} className="absolute inset-0 [&>canvas]:absolute [&>canvas]:inset-0 [&>canvas]:h-full [&>canvas]:w-full [&>video]:absolute [&>video]:inset-0 [&>video]:h-full [&>video]:w-full [&>video]:object-cover" />
        )}
        {phase === "scan" && !err && (
          <p className="pointer-events-none absolute inset-x-0 top-3 text-center text-sm font-medium text-white/90">Align the barcode inside the frame
            {orientType.startsWith("landscape") && <span className="mt-1 block text-xs text-white/70">Landscape crops the frame — portrait fits more of the code</span>}</p>
        )}
        {err && phase === "scan" && (
          <p role="alert" className="absolute inset-x-4 top-1/3 rounded-2xl bg-red-600/90 p-4 text-center text-sm font-semibold text-white">{err}</p>
        )}
      </div>
      <div className="bg-black px-4 pb-6 pt-2">
        {phase === "scan" && (
          <>
            <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden"
              aria-label="Take a barcode photo"
              onChange={(e) => void photoScan(e.target.files?.[0])} />
            <button onClick={() => photoRef.current?.click()}
              className="min-h-[44px] w-full rounded-xl border border-white/25 text-sm font-semibold text-white">📸 Or take a photo</button>
          </>
        )}
        <p className="mt-2 text-center text-xs text-white/60">WASM scan · EAN / UPC / Code128 / QR · beeps on read</p>
      </div>
    </div>
  );
}
