"use client";

import { useEffect, useRef, useState } from "react";
import { AdminCard, Empty } from "@/components/admin-ui";
import { WasmScanDialog } from "@/components/wasm-scan-dialog";

interface Line { productId: number; name: string; price: number; qty: number }
interface Found { id: number; name: string; price: number; stock: number }

type Detector = { detect(v: HTMLVideoElement | ImageBitmap): Promise<{ rawValue: string }[]> };
declare global {
  interface Window { BarcodeDetector?: new (opts?: object) => Detector }
}

const FORMATS = ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code", "itf"];

export function PosCounter() {
  const [lines, setLines] = useState<Line[]>([]);
  const [code, setCode] = useState("");
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Found[]>([]);
  const [held, setHeld] = useState<{ id: number; items: number; createdAt: string }[]>([]);
  const [msg, setMsg] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [flash, setFlash] = useState("");
  const [method, setMethod] = useState<"cash" | "upi" | "card">("cash");
  const [tendered, setTendered] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function addCode(raw: string) {
    const c = raw.trim();
    if (!c) return;
    const d = await fetch(`/api/shop/scan?code=${encodeURIComponent(c)}`).then((r) => r.json()).catch(() => null);
    if (!d?.ok) { setMsg(`No product for ${c}`); return; }
    addLine(d.productId, d.name, d.price);
    setMsg(`Added ${d.name} ✓`);
    setFlash(d.name);
    try { navigator.vibrate?.(60); } catch { /* ignore */ }
    setTimeout(() => setFlash((f) => (f === d.name ? "" : f)), 1800);
    setCode("");
  }

  function addLine(productId: number, name: string, price: number) {
    setLines((ls) => {
      const ex = ls.find((l) => l.productId === productId);
      if (ex) return ls.map((l) => (l.productId === productId ? { ...l, qty: l.qty + 1 } : l));
      return [...ls, { productId, name, price, qty: 1 }];
    });
  }

  function onSearch(v: string) {
    setQ(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (v.trim().length < 2) { setFound([]); return; }
    searchTimer.current = setTimeout(async () => {
      const d = await fetch(`/api/shop/products?q=${encodeURIComponent(v.trim())}`).then((r) => r.json()).catch(() => null);
      setFound((d?.products ?? []).slice(0, 8));
    }, 300);
  }

  async function loadHeld() {
    const d = await fetch("/api/retail/pos?held=1").then((r) => r.json()).catch(() => null);
    if (d?.held) setHeld(d.held);
  }

  // Photo fallback: native camera app (separate permission), decoded locally.
  async function photoScan(file: File | undefined) {
    if (!file) return;
    setMsg("Reading photo…");
    try {
      if (!("BarcodeDetector" in window) || !window.BarcodeDetector) throw new Error("no decoder");
      const bmp = await createImageBitmap(file);
      const det = new window.BarcodeDetector({ formats: FORMATS });
      const found = await det.detect(bmp);
      bmp.close();
      const v = found[0]?.rawValue || "";
      if (!v) throw new Error("empty");
      await addCode(v);
    } catch {
      setMsg("No barcode found in that photo — try closer, steadier, better light.");
    }
    if (photoRef.current) photoRef.current.value = "";
  }

  useEffect(() => {
    void loadHeld();
  }, []);

  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const tender = Math.round(Number(tendered) * 100) || 0;
  const change = method === "cash" && tender > 0 ? tender - total : 0;

  async function complete() {
    if (!lines.length) return;
    const res = await fetch("/api/retail/pos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        op: "sale", lines: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
        method, cashIn: method === "cash" && tender > 0 ? tender : 0,
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg(`Sold ✓ order #${d.orderId}${d.change ? ` · change ₹${(d.change / 100).toFixed(0)}` : method === "upi" ? " · collect on UPI" : method === "card" ? " · charged on terminal" : ""}`);
      setLines([]); setTendered("");
    } else setMsg(d.error ?? "sale failed");
  }

  async function hold() {
    if (!lines.length) return;
    const res = await fetch("/api/retail/pos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "hold", lines: lines.map((l) => ({ productId: l.productId, qty: l.qty })) }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setMsg(`Held as #${d.id} ✓`); setLines([]); void loadHeld(); }
    else setMsg(d.error ?? "hold failed");
  }

  async function resume(id: number) {
    const res = await fetch("/api/retail/pos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "resume", id }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.lines) { setMsg(d.error ?? "resume failed"); return; }
    const fresh: Line[] = [];
    for (const l of d.lines as { productId: number; qty: number }[]) {
      const p = await fetch(`/api/shop/products?id=${l.productId}`).then((r) => r.json()).catch(() => null);
      if (p?.product) fresh.push({ productId: l.productId, name: p.product.name, price: p.product.price, qty: l.qty });
    }
    setLines(fresh);
    setMsg(fresh.length ? `Resumed #${id} ✓` : "Held items no longer available");
    void loadHeld();
  }

  return (
    <div className="grid gap-3 lg:grid-cols-5">
      <div className="grid content-start gap-3 lg:col-span-3">
        <AdminCard>
          <p className="font-bold">Add items — scan, code, or search</p>
          <div className="mt-2 flex gap-1.5">
            <input value={code} onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void addCode(code); }}
              placeholder="Scan gun / type code + Enter" maxLength={40}
              inputMode="search" enterKeyHint="go"
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 font-mono text-sm dark:border-white/20" />
            <button onClick={() => void addCode(code)} disabled={!code.trim()}
              className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Add</button>
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <input value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Search products by name…" maxLength={60}
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
            <button onClick={() => setScanOpen(true)} aria-label="Open barcode scanner"
              className="min-h-[48px] flex-1 rounded-xl bg-black text-sm font-bold text-white dark:bg-white dark:text-black">⌁ Scan</button>
          </div>
          <div className="mt-1.5">
              <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden"
                aria-label="Take a barcode photo"
                onChange={(e) => void photoScan(e.target.files?.[0])} />
              <button onClick={() => photoRef.current?.click()}
                className="min-h-[44px] w-full rounded-xl border border-black/15 text-sm font-semibold dark:border-white/20">📸 Take barcode photo</button>
            </div>
          <WasmScanDialog open={scanOpen} onClose={() => setScanOpen(false)} onScan={(data) => { void addCode(data); }} />
          {found.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {found.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10">
                  <span className="min-w-0 truncate">{f.name} · ₹{(f.price / 100).toFixed(0)} · {f.stock} in stock</span>
                  <button onClick={() => { addLine(f.id, f.name, f.price); setFound([]); setQ(""); }}
                    className="min-h-[44px] shrink-0 rounded-xl bg-brand px-4 text-sm font-semibold text-white">+ Add</button>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
        <AdminCard>
          <p className="font-bold">Held sales ({held.length})</p>
          {held.length === 0 ? <p className="mt-1 text-sm text-zinc-500">Nothing on hold.</p> : (
            <ul className="mt-1.5 flex flex-wrap gap-1.5 text-sm">
              {held.map((h) => (
                <li key={h.id}>
                  <button onClick={() => void resume(h.id)}
                    className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">#{h.id} · {h.items} items →</button>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>
      <div className="grid content-start gap-3 lg:col-span-2">
        <AdminCard className="lg:sticky lg:top-24">
          <p className="flex items-center justify-between font-bold">Bill
            {lines.length > 0 && (
              <button onClick={() => void hold()} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Hold</button>
            )}
          </p>
          {lines.length === 0 ? <p className="mt-2 text-sm text-zinc-500">Empty — scan or search to add.</p> : (
            <ul className="mt-2 space-y-1 text-sm">
              {lines.map((l) => (
                <li key={l.productId} className="flex items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                  <span className="min-w-0 truncate">{l.name}</span>
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
          <p className="mt-2 text-right text-2xl font-extrabold">₹{(total / 100).toFixed(0)}</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5" role="group" aria-label="Payment method">
            {([
              ["cash", "💵 Cash"], ["upi", "📱 UPI"], ["card", "💳 Card"],
            ] as const).map(([m, label]) => (
              <button key={m} onClick={() => setMethod(m)} aria-pressed={method === m}
                className={`min-h-[52px] rounded-xl border text-sm font-bold ${method === m ? "border-brand bg-brand/10 text-brand-deep" : "border-black/15 dark:border-white/20"}`}>{label}</button>
            ))}
          </div>
          {method === "cash" && (
            <>
              <input value={tendered} onChange={(e) => setTendered(e.target.value)} placeholder="Cash tendered ₹" inputMode="decimal"
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
              {tender > 0 && (
                <p className={`mt-1 text-right text-sm font-bold ${change >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {change >= 0 ? `Change ₹${(change / 100).toFixed(0)}` : `Short ₹${(-change / 100).toFixed(0)}`}
                </p>
              )}
            </>
          )}
          {method === "upi" && <p className="mt-1.5 rounded-xl bg-black/5 px-3 py-2 text-sm dark:bg-white/10">Collect on the counter UPI QR, then tap Complete.</p>}
          {method === "card" && <p className="mt-1.5 rounded-xl bg-black/5 px-3 py-2 text-sm dark:bg-white/10">Swipe / insert / tap on the terminal, then tap Complete.</p>}
          <button onClick={() => void complete()} disabled={!lines.length || (method === "cash" && tender > 0 && change < 0)}
            className="mt-2 min-h-[52px] w-full rounded-xl bg-brand text-base font-bold text-white disabled:opacity-40">
            Complete · ₹{(total / 100).toFixed(0)}
          </button>
        </AdminCard>
      </div>
      {msg && <p className="text-sm text-zinc-500 lg:col-span-5">{msg}</p>}
    </div>
  );
}
