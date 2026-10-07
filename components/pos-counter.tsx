"use client";

import { useEffect, useRef, useState } from "react";
import { AdminCard, Empty } from "@/components/admin-ui";
import { CustomerPicker, type Cust } from "@/components/customer-picker";
import { Banknote, CreditCard, Plus, ScanBarcode, Smartphone } from "lucide-react"
import { Seg, IconBtn } from "@/components/admin-ux";
import { PosReceipt, type ReceiptData } from "@/components/pos-receipt";
import { QrImg } from "@/components/labels";
import { useLongPress } from "@mantine/hooks";
import { maskAmount, maskInt, maskPercent } from "@/lib/mask";
import { newIkey } from "@/lib/retail-core";
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
  const [qr, setQr] = useState<{ payload: string; upiId: string } | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [lastTender, setLastTender] = useState(0);
  const [lastChange, setLastChange] = useState(0);
  const [cardno, setCardno] = useState("");
  const [disval, setDisval] = useState("");
  const [disKind, setDisKind] = useState<"flat" | "pct">("flat");
  const [splitOn, setSplitOn] = useState(false);
  const [busy, setBusy] = useState(false);
  interface OutOp { ikey: string; body: Record<string, unknown>; at: string }
  const [outbox, setOutbox] = useState<OutOp[]>([]);
  const [dead, setDead] = useState<(OutOp & { error: string })[]>([]);
  const readBox = (k: string): OutOp[] => {
    try {
      const v = JSON.parse(window.localStorage.getItem(k) || "[]");
      return Array.isArray(v) ? v : [];
    } catch { return []; }
  };
  const [splits, setSplits] = useState<{ method: "cash" | "upi" | "card"; amt: string }[]>([
    { method: "upi", amt: "" }, { method: "cash", amt: "" },
  ]);
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

  function addLine(productId: number, name: string, price: number, qty = 1) {
    setLines((ls) => {
      const ex = ls.find((l) => l.productId === productId);
      if (ex) return ls.map((l) => (l.productId === productId ? { ...l, qty: l.qty + qty } : l));
      return [...ls, { productId, name, price, qty }];
    });
  }

  // Mantine use-long-press recipe: tap adds 1, hold (600ms) adds 5.
  const holdTarget = useRef<{ id: number; name: string; price: number } | null>(null);
  const swallowed = useRef(false);
  const holdPress = useLongPress(() => {
    const f = holdTarget.current;
    if (f) { swallowed.current = true; addLine(f.id, f.name, f.price, 5); setFound([]); setQ(""); }
  }, { threshold: 600 });

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
    // Scanner tray handoff: the floating bar stages scans here, POS consumes.
    try {
      const raw = window.localStorage.getItem("cr_scan_tray");
      const tray = raw ? (JSON.parse(raw) as { id: number; name: string; price: number }[]) : [];
      if (Array.isArray(tray) && tray.length > 0) {
        for (const l of tray.slice(0, 50)) {
          if (Number(l.id) > 0) addLine(Number(l.id), String(l.name || "Item"), Math.max(0, Math.round(Number(l.price) || 0)));
        }
        window.localStorage.removeItem("cr_scan_tray");
        setMsg(`${tray.length} item${tray.length === 1 ? "" : "s"} from scanner ✓ — tender below`);
      }
    } catch { /* corrupt tray never breaks the counter */ }
    setOutbox(readBox("cr_outbox"));
    setDead(readBox("cr_outbox_dead") as (OutOp & { error: string })[]);
    const onOnline = () => { void syncOutbox(); };
    window.addEventListener("online", onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => window.removeEventListener("online", onOnline);
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
  const pcs = lines.reduce((s, l) => s + l.qty, 0);
  const [billGrand, setBillGrand] = useState<number | null>(null);
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!splitOn || lines.length === 0) { setBillGrand(null); return; }
    if (quoteTimer.current) clearTimeout(quoteTimer.current);
    quoteTimer.current = setTimeout(async () => {
      const dis = disval ? (disKind === "pct"
        ? Math.round((total * Math.min(100, Number(disval) || 0)) / 100)
        : Math.round(Number(disval) * 100)) : 0;
      const d = await fetch("/api/shop/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
          customerId: customer?.id, ...(dis > 0 ? { manualDiscount: dis } : {}),
        }),
      }).then((r) => r.json()).catch(() => null);
      setBillGrand(typeof d?.grand === "number" ? d.grand : null);
    }, 400);
    return () => { if (quoteTimer.current) clearTimeout(quoteTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitOn, lines, disval, disKind, customer]);
  const splitSum = splits.reduce((s, x) => s + Math.round(Number(x.amt || 0) * 100), 0);
  const splitLeft = total - splitSum;
  const tender = Math.round(Number(tendered) * 100) || 0;
  const change = method === "cash" && tender > 0 ? tender - total : 0;

  // Business VPA QR for UPI collection (amount-bound, refreshed per bill).
  const upiDue = splitOn
    ? splits.filter((x) => x.method === "upi").reduce((s, x) => s + Math.round(Number(x.amt || 0) * 100), 0)
    : method === "upi" ? total : 0;
  useEffect(() => {
    if (upiDue <= 0) { setQr(null); return; }
    fetch("/api/pay/link?qr=1").then((r) => r.json()).then((d) => {
      const q = (d?.qrs ?? []).find((x: { upiId: string }) => x.upiId?.includes("@"));
      if (!q) { setQr(null); return; }
      const p = new URLSearchParams({ pa: q.upiId, pn: (q.name || "Merchant").slice(0, 60), cu: "INR", am: (upiDue / 100).toFixed(2) });
      setQr({ payload: `upi://pay?${p}`, upiId: q.upiId });
    }).catch(() => setQr(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upiDue, method, splitOn]);

  async function postSale(body: Record<string, unknown>): Promise<{ ok: boolean; orderId: number; change: number; deduped?: boolean; error?: string }> {
    try {
      const res = await fetch("/api/retail/pos", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, orderId: 0, change: 0, error: d.error ?? "sale failed" };
      return { ok: true, orderId: d.orderId, change: d.change ?? 0, deduped: d.deduped };
    } catch {
      return { ok: false, orderId: 0, change: 0, error: "offline" };
    }
  }

  async function settleSold(orderId: number, wasSplit: boolean) {
    const r = await fetch(`/api/retail/receipt?orderId=${orderId}`).then((x) => x.json()).catch(() => null);
    if (wasSplit) { setLastTender(0); setLastChange(0); }
    if (r?.crn) { setReceipt(r); setMsg(""); }
    else setMsg(`Sold ✓ order #${orderId}`);
    setLines([]); setTendered(""); setDisval(""); setCustomer(null);
    setSplits([{ method: "upi", amt: "" }, { method: "cash", amt: "" }]);
  }

  function queueOffline(body: Record<string, unknown>) {
    const op: OutOp = { ikey: String(body.ikey), body, at: new Date().toISOString() };
    const next = [...readBox("cr_outbox"), op].slice(-20);
    try { window.localStorage.setItem("cr_outbox", JSON.stringify(next)); } catch { /* full */ }
    setOutbox(next);
    setMsg("Offline — sale queued ✓ will sync automatically");
  }

  async function syncOutbox() {
    const ops = readBox("cr_outbox");
    if (ops.length === 0) { setOutbox([]); return; }
    let ok = 0;
    const left: OutOp[] = [];
    const buried: (OutOp & { error: string })[] = readBox("cr_outbox_dead") as (OutOp & { error: string })[];
    for (const op of ops) {
      const r = await postSale(op.body);
      if (r.ok) { ok++; }
      else if (r.error === "offline") { left.push(op); break; }
      else { buried.push({ ...op, error: r.error ?? "failed" }); }
    }
    try {
      window.localStorage.setItem("cr_outbox", JSON.stringify(left));
      window.localStorage.setItem("cr_outbox_dead", JSON.stringify(buried.slice(-20)));
    } catch { /* ignore */ }
    setOutbox(left);
    setDead(buried.slice(-20));
    setMsg(ok > 0 ? `Synced ${ok} queued sale${ok === 1 ? "" : "s"} ✓` : (left.length > 0 ? "Still offline — kept queued." : "Nothing synced."));
    if (ok > 0) void loadHeld();
  }

  async function complete() {
    if (!lines.length || busy) return;
    setBusy(true);
    try {
      const dis = disval
        ? disKind === "pct"
          ? { discountPct: Math.min(100, Number(disval) || 0) }
          : { discountPaise: Math.round(Number(disval) * 100) }
        : {};
      const base = {
        op: "sale", ikey: newIkey(),
        lines: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
        customerId: customer?.id, ...dis,
      };
      const body: Record<string, unknown> = splitOn
        ? { ...base, payments: splits.map((x) => ({ method: x.method, amount: Math.round(Number(x.amt) * 100) })) }
        : { ...base, method, cashIn: method === "cash" && tender > 0 ? tender : 0 };
      if (splitOn) {
        const due = billGrand ?? total;
        if (splitSum !== due) { setMsg(`Split ₹${(splitSum / 100).toFixed(0)} must equal bill ₹${(due / 100).toFixed(0)} — fix or auto-fill.`); return; }
      }
      const r = await postSale(body);
      if (!r.ok && r.error === "offline") { queueOffline(body); return; }
      if (!r.ok) { setMsg(r.error ?? "sale failed"); return; }
      await settleSold(r.orderId, splitOn);
    } finally {
      setBusy(false);
    }
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
      {receipt ? (
        <div className="lg:col-span-5">
          <PosReceipt data={receipt} tendered={lastTender} change={lastChange} onNew={() => { setReceipt(null); setMsg(""); }} />
        </div>
      ) : (
        <>
      <div className="grid content-start gap-3 lg:col-span-3">
        <AdminCard>
          <p className="font-bold">Add items — scan, code, or search</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <input ref={codeRef} value={code} onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void addCode(code); }}
              placeholder="Scan gun / type code + Enter" maxLength={40}
              inputMode="search" enterKeyHint="go"
              className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 font-mono text-sm dark:border-white/20" />
            <IconBtn label="Add" onClick={() => void addCode(code)} disabled={!code.trim()} tone="brand"><Plus size={20} /></IconBtn>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <input ref={searchRef} value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Search products by name… (F2)" maxLength={60}
              className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
            <IconBtn label="Open barcode scanner (F3)" hint="Scan (F3)" onClick={() => setScanOpen(true)} tone="dark" large><ScanBarcode size={24} /></IconBtn>
          </div>
          <div className="mt-1.5">
              <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden"
                aria-label="Take a barcode photo"
                onChange={(e) => void photoScan(e.target.files?.[0])} />
              <button onClick={() => photoRef.current?.click()}
                className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-black/15 text-sm font-semibold dark:border-white/20"><ScanBarcode size={18} /> Take barcode photo</button>
            </div>
          <WasmScanDialog open={scanOpen} onClose={() => setScanOpen(false)} onScan={(data) => { void addCode(data); }} />
          {found.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {found.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10">
                  <span className="min-w-0 flex-1 truncate">{f.name} · ₹{(f.price / 100).toFixed(0)} · {f.stock} in stock</span>
                  <IconBtn label="Add to bill" hint="Add to bill (hold for 5)" tone="brand"
                    onClick={() => { if (swallowed.current) { swallowed.current = false; return; } addLine(f.id, f.name, f.price); setFound([]); setQ(""); }}
                    extra={{
                      onMouseDown: (e) => { holdTarget.current = { id: f.id, name: f.name, price: f.price }; holdPress.onMouseDown?.(e); },
                      onMouseUp: (e) => holdPress.onMouseUp?.(e),
                      onMouseLeave: (e) => holdPress.onMouseLeave?.(e),
                      onTouchStart: (e) => { holdTarget.current = { id: f.id, name: f.name, price: f.price }; holdPress.onTouchStart?.(e); },
                      onTouchEnd: (e) => holdPress.onTouchEnd?.(e),
                    }}><Plus size={20} /></IconBtn>
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
          {flash ? <p role="status" className="rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">Added {flash} ✓</p> : null}
          {outbox.length > 0 && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
              <p className="flex flex-wrap items-center justify-between gap-2 font-bold">
                <span>Offline — {outbox.length} sale{outbox.length === 1 ? "" : "s"} queued</span>
                <button onClick={() => void syncOutbox()} className="min-h-[44px] rounded-xl bg-brand px-4 text-white">Sync now</button>
              </p>
            </div>
          )}
          {dead.length > 0 && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">
              <p className="font-bold">Sync conflicts ({dead.length}) — review, then discard or re-ring:</p>
              <ul className="mt-1 space-y-1 font-mono text-xs">
                {dead.map((d, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate">{d.error}</span>
                    <button onClick={() => {
                      const next = dead.filter((_, j) => j !== i);
                      try { window.localStorage.setItem("cr_outbox_dead", JSON.stringify(next)); } catch { /* ignore */ }
                      setDead(next);
                    }} aria-label="Discard conflict" className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">Discard</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="flex items-center justify-between font-bold">Bill
            {lines.length > 0 && (
              <button onClick={() => void hold()} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Hold</button>
            )}
          </p>
          {lines.length === 0 ? <p className="mt-2 text-sm text-zinc-500">Empty — scan or search to add.</p> : (
            <ul className="mt-2 space-y-1 text-sm">
              {lines.map((l) => (
                <li key={l.productId} className="grid gap-1.5 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                  <span className="flex min-w-0 items-baseline justify-between gap-x-2"><span className="min-w-0 flex-1 truncate font-semibold">{l.name}</span><b className="shrink-0">₹{(l.price * l.qty / 100).toFixed(0)}</b></span>
                  <span className="flex items-center justify-between gap-1"><span className="flex items-center gap-1">
                    <button aria-label={`Less ${l.name}`} onClick={() => setLines((ls) => ls.map((x) => (x.productId === l.productId ? { ...x, qty: x.qty - 1 } : x)).filter((x) => x.qty > 0))}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/15 text-lg dark:border-white/20">−</button>
                    <b className="w-6 text-center">{l.qty}</b>
                    <button aria-label={`More ${l.name}`} onClick={() => setLines((ls) => ls.map((x) => (x.productId === l.productId ? { ...x, qty: x.qty + 1 } : x)))}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/15 text-lg dark:border-white/20">+</button>
                    </span>
                    <span className="text-xs text-zinc-500">₹{(l.price / 100).toFixed(0)} each</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-right text-xs text-zinc-500">{lines.length} item{lines.length === 1 ? "" : "s"} · {pcs} pc{pcs === 1 ? "" : "s"}</p>
          <p className="text-right text-2xl font-extrabold">Total ₹{(total / 100).toFixed(0)}</p>
          <div className="mt-2">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-zinc-500">Customer (optional)</p>
            <CustomerPicker customer={customer} onPick={setCustomer} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <input value={cardno} onChange={(e) => setCardno(e.target.value)} placeholder="Loyalty card no" maxLength={24}
              className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 font-mono text-sm uppercase dark:border-white/20" />
            <button onClick={() => void lookupCard()} disabled={cardno.trim().length < 3}
              className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20 disabled:opacity-40">Card →</button>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <input value={disval} onChange={(e) => setDisval(disKind === "pct" ? maskPercent(e.target.value) : maskAmount(e.target.value))} placeholder="Override discount" inputMode="decimal"
              className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
            <select value={disKind} onChange={(e) => setDisKind(e.target.value as "flat" | "pct")} aria-label="Discount type"
              className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
              <option value="flat">₹ flat</option>
              <option value="pct">%</option>
            </select>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">Manual discounts need the override flag (Settings → Service flags).</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Pay</p>
            <button onClick={() => setSplitOn((s) => !s)} aria-pressed={splitOn}
              className={`min-h-[44px] rounded-xl border px-4 text-sm font-semibold ${splitOn ? "border-brand bg-brand/10 text-brand-deep" : "border-black/15 dark:border-white/20"}`}>
              Split tender</button>
            {splitOn && <span className="text-xs text-zinc-500">Bill ₹{billGrand === null ? "…" : (billGrand / 100).toFixed(0)} · exact, no change</span>}
          </div>
          {splitOn ? (
            <div className="mt-1.5 grid gap-1.5">
              {splits.map((x, i) => (
                <div key={i} className="flex flex-wrap gap-1.5">
                  <select value={x.method} onChange={(e) => setSplits((ss) => ss.map((y, j) => (j === i ? { ...y, method: e.target.value as "cash" | "upi" | "card" } : y)))} aria-label={`Split ${i + 1} method`}
                    className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
                    <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option>
                  </select>
                  <input value={x.amt} onChange={(e) => setSplits((ss) => ss.map((y, j) => (j === i ? { ...y, amt: maskAmount(e.target.value) } : y)))}
                    placeholder="₹" inputMode="decimal" aria-label={`Split ${i + 1} amount`}
                    className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
                  {splits.length > 1 && (
                    <button onClick={() => setSplits((ss) => ss.filter((_, j) => j !== i))} aria-label={`Remove split ${i + 1}`}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/15 dark:border-white/20">✕</button>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap gap-1.5">
                {splits.length < 3 && (
                  <button onClick={() => setSplits((ss) => [...ss, { method: "card", amt: "" }])}
                    className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">+ Add split</button>
                )}
                <button onClick={() => {
                  const due = billGrand ?? total;
                  const rest = due - splits.slice(0, -1).reduce((s, x) => s + Math.round(Number(x.amt || 0) * 100), 0);
                  setSplits((ss) => ss.map((y, j) => (j === ss.length - 1 ? { ...y, amt: (Math.max(0, rest) / 100).toFixed(0) } : y)));
                }} className="min-h-[44px] rounded-xl border border-brand/40 px-4 text-sm font-semibold text-brand-deep">Auto-fill remainder</button>
              </div>
              <p className="text-right text-sm font-bold">Split ₹{(splitSum / 100).toFixed(0)} / ₹{((billGrand ?? total) / 100).toFixed(0)}</p>
            </div>
          ) : (
          <div className="mt-2 grid grid-cols-3 gap-1.5" role="group" aria-label="Payment method">
            {([
              ["cash", "Cash", Banknote], ["upi", "UPI", Smartphone], ["card", "Card", CreditCard],
            ] as const).map(([m, label, Icon]) => (
              <button key={m} onClick={() => setMethod(m)} aria-pressed={method === m}
                className={`flex min-h-[52px] items-center justify-center gap-1.5 rounded-xl border text-sm font-bold ${method === m ? "border-brand bg-brand/10 text-brand-deep" : "border-black/15 dark:border-white/20"}`}><Icon size={18} />{label}</button>
            ))}
          </div>
          )}
          {!splitOn && method === "cash" && (
            <>
              <input value={tendered} onChange={(e) => setTendered(maskAmount(e.target.value))} placeholder="Cash tendered ₹" inputMode="decimal"
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
              {tender > 0 && (
                <p className={`mt-1 text-right text-sm font-bold ${change >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {change >= 0 ? `Change ₹${(change / 100).toFixed(0)}` : `Short ₹${(-change / 100).toFixed(0)}`}
                </p>
              )}
            </>
          )}
          {(splitOn ? upiDue > 0 : method === "upi") && (
            qr ? (
              <div className="mt-1.5 grid justify-items-center gap-1 rounded-xl bg-black/5 px-3 py-2 dark:bg-white/10">
                <QrImg text={qr.payload} size={180} />
                <p className="font-mono text-xs font-bold">{qr.upiId}</p>
                <p className="text-sm font-extrabold">Collect ₹{(upiDue / 100).toFixed(0)} — then tap Complete below to confirm</p>
              </div>
            ) : (
              <p className="mt-1.5 rounded-xl bg-black/5 px-3 py-2 text-sm dark:bg-white/10">
                No business VPA saved — add one in <a href="/admin/billing" className="font-semibold text-brand-deep underline">Billing → UPI QR codes</a>, then collect & tap Complete.</p>
            )
          )}
          {!splitOn && method === "card" && <p className="mt-1.5 rounded-xl bg-black/5 px-3 py-2 text-sm dark:bg-white/10">Swipe / insert / tap on the terminal, then tap Complete.</p>}
          <button onClick={() => void complete()}
            disabled={busy || !lines.length || (splitOn ? splitSum !== (billGrand ?? total) : (method === "cash" && tender > 0 && change < 0))}
            className="mt-2 min-h-[52px] w-full rounded-xl bg-brand text-base font-bold text-white disabled:opacity-40">
            {busy ? "Working…" : `Complete · ₹${((splitOn ? (billGrand ?? total) : total) / 100).toFixed(0)}`}
          </button>
        </AdminCard>
      </div>
        </>
      )}
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
      <Seg value={kind} onChange={(v) => setKind(v)} label="Product kind"
        data={[{ value: "physical", label: "Physical" }, { value: "service", label: "Service" }, { value: "digital", label: "Digital" }]} />
      <div className="flex gap-1.5">
        <input value={price} onChange={(e) => setPrice(maskAmount(e.target.value))} placeholder="₹ price" inputMode="decimal"
          className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        {kind === "physical" && (
          <input value={stock} onChange={(e) => setStock(maskInt(e.target.value))} placeholder="Stock" inputMode="numeric"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        )}
      </div>
      <button onClick={() => void save()} disabled={!name.trim() || !price}
        className="min-h-[44px] rounded-xl bg-brand text-sm font-bold text-white disabled:opacity-40">Save &amp; add to cart</button>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  );
}
