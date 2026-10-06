"use client";

import { useEffect, useRef, useState } from "react";
import { AdminCard, Empty } from "@/components/admin-ui";
import { CustomerPicker, type Cust } from "@/components/customer-picker";
import { WasmScanDialog } from "@/components/wasm-scan-dialog";
import { modals } from "@mantine/modals";

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
  const [customer, setCustomer] = useState<Cust | null>(null);
  const [cardno, setCardno] = useState("");
  const [disval, setDisval] = useState("");
  const [disKind, setDisKind] = useState<"flat" | "pct">("flat");
  const photoRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function addCode(raw: string) {
    const c = raw.trim();
    if (!c) return;
    const d = await fetch(`/api/shop/scan?code=${encodeURIComponent(c)}`).then((r) => r.json()).catch(() => null);
    if (d?.ok) {
      // Weighted barcodes carry the quantity (kg) in the code itself.
      if (typeof d.weightKg === "number" && d.weightKg > 0) {
        addLine(d.productId, `${d.name} (${d.weightKg}kg)`, d.price);
        setLines((ls) => ls.map((l) => (l.productId === d.productId ? { ...l, qty: d.weightKg } : l)));
      } else {
        addLine(d.productId, d.name, d.price);
      }
      setMsg(`Added ${d.name} ✓`);
      setFlash(d.name);
      try { navigator.vibrate?.(60); } catch { /* ignore */ }
      setTimeout(() => setFlash((f) => (f === d.name ? "" : f)), 1800);
      setCode("");
      return;
    }
    // Unknown code → fast-add dialog (name + price + stock, then into cart).
    quickAdd(c);
  }

  function quickAdd(code: string) {
    modals.open({
      title: `Quick add — ${code.slice(0, 24)}`,
      children: <QuickAddForm code={code} onDone={(id, n, p) => {
        modals.closeAll();
        addLine(id, n, p);
        setMsg(`Created + added ${n} ✓`);
        setCode("");
      }} />,
    });
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

  // F2 search · F3 scan · ESC closes dialogs. Never hijacks text inputs.
  const codeRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "F2") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "F3") { e.preventDefault(); setScanOpen(true); }
      if (e.key === "F4") { e.preventDefault(); codeRef.current?.focus(); }
      if (e.key === "Escape") { modals.closeAll(); setScanOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const tender = Math.round(Number(tendered) * 100) || 0;
  const change = method === "cash" && tender > 0 ? tender - total : 0;

  async function complete() {
    if (!lines.length) return;
    const dis = disval
      ? disKind === "pct"
        ? { discountPct: Math.min(100, Number(disval) || 0) }
        : { discountPaise: Math.round(Number(disval) * 100) }
      : {};
    const res = await fetch("/api/retail/pos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        op: "sale", lines: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
        customerId: customer?.id,
        method, cashIn: method === "cash" && tender > 0 ? tender : 0, ...dis,
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg(`Sold ✓ order #${d.orderId}${d.change ? ` · change ₹${(d.change / 100).toFixed(0)}` : method === "upi" ? " · collect on UPI" : method === "card" ? " · charged on terminal" : ""}`);
      setLines([]); setTendered(""); setDisval("");
    } else setMsg(d.error ?? "sale failed");
  }

  async function lookupCard() {
    if (cardno.trim().length < 3) return;
    const d = await fetch(`/api/crm/customers?card=${encodeURIComponent(cardno.trim())}`).then((r) => r.json()).catch(() => null);
    if (d?.ok) {
      setCustomer({ id: d.id, name: d.name, phone: d.phone });
      setMsg(`Card ${cardno.trim().toUpperCase()} → ${d.name} ✓ (member pricing where set)`);
    } else setMsg("Unknown card.");
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
            <input ref={codeRef} value={code} onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void addCode(code); }}
              placeholder="Scan gun / type code + Enter" maxLength={40}
              inputMode="search" enterKeyHint="go"
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 font-mono text-sm dark:border-white/20" />
            <button onClick={() => void addCode(code)} disabled={!code.trim()}
              className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Add</button>
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <input ref={searchRef} value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Search products by name… (F2)" maxLength={60}
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
            <button onClick={() => setScanOpen(true)} aria-label="Open barcode scanner (F3)" title="Scan (F3)"
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
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10">
                  <span className="min-w-0 flex-1 truncate">{f.name} · ₹{(f.price / 100).toFixed(0)} · {f.stock} in stock</span>
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
                <li key={l.productId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                  <span className="min-w-0 flex-1 truncate">{l.name}</span>
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
          <div className="mt-2">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-zinc-500">Customer (optional)</p>
            <CustomerPicker customer={customer} onPick={setCustomer} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <input value={cardno} onChange={(e) => setCardno(e.target.value)} placeholder="Loyalty card no" maxLength={24}
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 font-mono text-sm uppercase dark:border-white/20" />
            <button onClick={() => void lookupCard()} disabled={cardno.trim().length < 3}
              className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20 disabled:opacity-40">Card →</button>
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <input value={disval} onChange={(e) => setDisval(e.target.value)} placeholder="Override discount" inputMode="decimal"
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
            <select value={disKind} onChange={(e) => setDisKind(e.target.value as "flat" | "pct")} aria-label="Discount type"
              className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
              <option value="flat">₹ flat</option>
              <option value="pct">%</option>
            </select>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">Manual discounts need the override flag (Settings → Service flags).</p>
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

// Quick-add: unknown scan → minimal product, type-adaptive fields, straight to cart.
function QuickAddForm({ code, onDone }: { code: string; onDone: (id: number, name: string, price: number) => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("physical");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [msg, setMsg] = useState("");
  const [valid, setValid] = useState<{ valid: boolean; type: string } | null>(null);

  useEffect(() => {
    fetch("/api/shop/barcode", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "validate", code }),
    }).then((r) => r.json()).then((d) => {
      if (d && typeof d.valid === "boolean") setValid(d);
    }).catch(() => {});
  }, [code]);

  async function save() {
    const res = await fetch("/api/shop/barcode", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        op: "quick-create", barcode: code, name,
        kind, price: Math.round(Number(price) * 100), stock: kind === "physical" ? Math.round(Number(stock) || 0) : 0,
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) onDone(d.id, name, Math.round(Number(price) * 100));
    else setMsg(d.error ?? d.code ?? "create failed");
  }

  return (
    <div className="grid gap-2">
      <p className="font-mono text-sm">Code: <b>{code}</b></p>
      {valid && (
        <p className={`text-sm font-semibold ${valid.valid ? "text-emerald-700" : "text-red-600"}`}>
          {valid.valid ? `✓ Valid ${valid.type}` : "✗ Invalid — will save as custom code"}
        </p>
      )}
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" maxLength={150}
        className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
      <div className="flex gap-1.5">
        {(["physical", "service", "digital"] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k}
            className={`min-h-[44px] flex-1 rounded-xl border text-sm font-bold uppercase ${kind === k ? "border-brand bg-brand/10 text-brand-deep" : "border-black/15 dark:border-white/20"}`}>{k}</button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="₹ price" inputMode="decimal"
          className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        {kind === "physical" && (
          <input value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Stock" inputMode="numeric"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        )}
      </div>
      <button onClick={() => void save()} disabled={!name.trim() || !price}
        className="min-h-[44px] rounded-xl bg-brand text-sm font-bold text-white disabled:opacity-40">Save &amp; add to cart</button>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  );
}
