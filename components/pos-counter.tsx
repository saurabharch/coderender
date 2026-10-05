"use client";

import { useEffect, useRef, useState } from "react";
import { AdminCard, Empty } from "@/components/admin-ui";

interface Line { productId: number; name: string; price: number; qty: number }

type Detector = { detect(v: HTMLVideoElement): Promise<{ rawValue: string }[]> };
declare global {
  interface Window { BarcodeDetector?: new (opts?: object) => Detector }
}

const FORMATS = ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code", "itf"];

export function PosCounter() {
  const [lines, setLines] = useState<Line[]>([]);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [cam, setCam] = useState<"on" | "off" | "unsupported">("off");
  const [method, setMethod] = useState("cash");
  const [tendered, setTendered] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRef = useRef(false);

  async function addCode(raw: string) {
    const c = raw.trim();
    if (!c) return;
    const d = await fetch(`/api/shop/scan?code=${encodeURIComponent(c)}`).then((r) => r.json()).catch(() => null);
    if (!d?.ok) { setMsg(`No product for ${c}`); return; }
    setLines((ls) => {
      const ex = ls.find((l) => l.productId === d.productId);
      if (ex) return ls.map((l) => (l.productId === d.productId ? { ...l, qty: l.qty + 1 } : l));
      return [...ls, { productId: d.productId, name: d.name, price: d.price, qty: 1 }];
    });
    setMsg(`Added ${d.name} ✓`);
    setCode("");
  }

  async function startCam() {
    if (!("BarcodeDetector" in window) || !window.BarcodeDetector) { setCam("unsupported"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const video = videoRef.current;
      if (!video) { stream.getTracks().forEach((t) => t.stop()); return; }
      video.srcObject = stream;
      await video.play();
      setCam("on");
      stopRef.current = false;
      const det = new window.BarcodeDetector({ formats: FORMATS });
      let last = "";
      while (!stopRef.current) {
        try {
          const found = await det.detect(video);
          const v = found[0]?.rawValue || "";
          if (v && v !== last && Date.now() - Number(last.split("@")[1] || 0) > 1500) {
            last = `${v}@${Date.now()}`;
            await addCode(v);
          }
        } catch { /* keep scanning */ }
        await new Promise((r) => setTimeout(r, 400));
      }
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setCam("unsupported");
    }
    setCam((c) => (c === "on" ? "off" : c));
  }

  function stopCam() {
    stopRef.current = true;
    const v = videoRef.current;
    const s = v?.srcObject as MediaStream | null;
    s?.getTracks().forEach((t) => t.stop());
    if (v) v.srcObject = null;
    setCam("off");
  }

  useEffect(() => () => { stopRef.current = true; }, []);

  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);

  async function complete() {
    if (!lines.length) return;
    const res = await fetch("/api/retail/pos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        op: "sale", lines: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
        method, cashIn: method === "cash" && tendered ? Math.round(Number(tendered) * 100) : 0,
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg(`Sold ✓ order #${d.orderId}${d.change ? ` · change ₹${(d.change / 100).toFixed(0)}` : ""}`);
      setLines([]); setTendered("");
    } else setMsg(d.error ?? "sale failed");
  }

  return (
    <div className="grid gap-3">
      <AdminCard>
        <p className="font-bold">Scan item</p>
        <div className="mt-2 flex gap-1.5">
          <input value={code} onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void addCode(code); }}
            placeholder="Scan gun, type code, or use camera…" maxLength={40}
            inputMode="search" enterKeyHint="go"
            className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 font-mono text-sm dark:border-white/20" />
          <button onClick={() => void addCode(code)} disabled={!code.trim()}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Add</button>
        </div>
        <div className="mt-2">
          {cam === "on" ? (
            <>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full rounded-xl bg-black object-cover" />
              <button onClick={stopCam} className="mt-1.5 min-h-[44px] w-full rounded-xl border border-black/15 text-sm font-semibold dark:border-white/20">Stop camera</button>
            </>
          ) : cam === "unsupported" ? (
            <p className="text-sm text-zinc-500">This browser has no barcode camera API — type the code or use a scan gun (it types for you).</p>
          ) : (
            <button onClick={() => void startCam()}
              className="min-h-[44px] w-full rounded-xl border border-black/15 text-sm font-semibold dark:border-white/20">📷 Scan with camera</button>
          )}
        </div>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Cart ({lines.reduce((s, l) => s + l.qty, 0)} items)</p>
        {lines.length === 0 ? <div className="mt-2"><Empty>Scan or add the first item.</Empty></div> : (
          <ul className="mt-2 space-y-1 text-sm">
            {lines.map((l) => (
              <li key={l.productId} className="flex items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span className="min-w-0 truncate">{l.name} · ₹{(l.price / 100).toFixed(0)}</span>
                <span className="flex shrink-0 items-center gap-1">
                  <button aria-label={`Less ${l.name}`} onClick={() => setLines((ls) => ls.map((x) => (x.productId === l.productId ? { ...x, qty: x.qty - 1 } : x)).filter((x) => x.qty > 0))}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/15 text-lg dark:border-white/20">−</button>
                  <b className="w-6 text-center">{l.qty}</b>
                  <button aria-label={`More ${l.name}`} onClick={() => setLines((ls) => ls.map((x) => (x.productId === l.productId ? { ...x, qty: x.qty + 1 } : x)))}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/15 text-lg dark:border-white/20">+</button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-right text-xl font-extrabold">₹{(total / 100).toFixed(0)}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(["cash", "upi", "card"] as const).map((m) => (
            <button key={m} onClick={() => setMethod(m)}
              className={`min-h-[44px] flex-1 rounded-xl border px-3 text-sm font-bold uppercase ${method === m ? "border-brand bg-brand/10 text-brand-deep" : "border-black/15 dark:border-white/20"}`}>{m}</button>
          ))}
        </div>
        {method === "cash" && (
          <input value={tendered} onChange={(e) => setTendered(e.target.value)} placeholder="Cash tendered ₹" inputMode="decimal"
            className="mt-1.5 min-h-[44px] w-full rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        )}
        <button onClick={() => void complete()} disabled={!lines.length}
          className="mt-2 min-h-[48px] w-full rounded-xl bg-brand text-base font-bold text-white disabled:opacity-40">
          Complete sale · ₹{(total / 100).toFixed(0)}
        </button>
      </AdminCard>
      {msg && <p className="text-sm text-zinc-500">{msg}</p>}
    </div>
  );
}
