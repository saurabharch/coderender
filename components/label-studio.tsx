"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EanBars, QrImg } from "@/components/labels";

interface Lot { id: number; lot: string; mfg: string; exp: string }
interface Prod { id: number; name: string; price: number; mrp: number; barcode: string; sku: string }

type Paper = "roll80" | "roll58" | "a4" | "custom";
type Mode = "both" | "qr" | "barcode";

interface Show { name: boolean; pid: boolean; price: boolean; mrp: boolean; barcode: boolean; qr: boolean; sku: boolean; batch: boolean }
interface Settings {
  paper: Paper; paperW: number; paperH: number; orient: "portrait" | "landscape";
  stW: number; stH: number; gapX: number; gapY: number; padX: number; padY: number;
  mode: Mode; show: Show;
}

export const STICKER_PRESETS: Record<string, { label: string; w: number; h: number }> = {
  "30x20": { label: "30 × 20 mm", w: 30, h: 20 },
  "38x21": { label: "38 × 21 mm", w: 38, h: 21 },
  "40x25": { label: "40 × 25 mm", w: 40, h: 25 },
  "50x25": { label: "50 × 25 mm", w: 50, h: 25 },
  "50x30": { label: "50 × 30 mm", w: 50, h: 30 },
  "70x35": { label: "70 × 35 mm", w: 70, h: 35 },
  "100x50": { label: "100 × 50 mm", w: 100, h: 50 },
};

const DEFAULTS: Settings = {
  paper: "roll80", paperW: 80, paperH: 297, orient: "portrait",
  stW: 50, stH: 30, gapX: 2, gapY: 2, padX: 2, padY: 3,
  mode: "both",
  show: { name: true, pid: true, price: true, mrp: true, barcode: true, qr: true, sku: false, batch: true },
};

const LS_KEY = "cr_label_settings_v1";
const BATCH_KEY = "cr_label_batch_v1";
const BATCH_CAP = 999;

export interface BatchItem {
  id: number; name: string; price: number; mrp: number;
  barcode: string; sku: string; copies: number;
}

function loadBatch(): BatchItem[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(BATCH_KEY) || "[]");
    if (!Array.isArray(v)) return [];
    return v.filter((x) => Number(x?.id) > 0 && Number(x?.copies) > 0)
      .map((x) => ({
        id: Number(x.id), name: String(x.name || "Item").slice(0, 150),
        price: Math.max(0, Math.round(Number(x.price) || 0)),
        mrp: Math.max(0, Math.round(Number(x.mrp) || 0)),
        barcode: String(x.barcode || "").slice(0, 40), sku: String(x.sku || "").slice(0, 40),
        copies: Math.min(999, Math.max(1, Math.round(Number(x.copies) || 1))),
      })).slice(0, 50);
  } catch { return []; }
}

function loadSaved(): Settings {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULTS;
    const s = { ...DEFAULTS, ...JSON.parse(raw) };
    s.show = { ...DEFAULTS.show, ...(JSON.parse(raw).show ?? {}) };
    return s;
  } catch { return DEFAULTS; }
}

const num = (v: string, fb: number, lo: number, hi: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fb;
};

export function LabelStudio({ product, lots, initial }: {
  product: Prod; lots: Lot[]; initial: { copies: number; lot: string; mode: Mode; stW?: number; stH?: number };
}) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<"print" | "batch" | "settings">("print");
  const [copies, setCopies] = useState(initial.copies);
  const [lotId, setLotId] = useState(initial.lot);
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [batchReady, setBatchReady] = useState(false);

  useEffect(() => {
    let raw: string | null = null;
    try { raw = window.localStorage.getItem(LS_KEY); } catch { /* private mode */ }
    if (raw) {
      setSettings(loadSaved());
    } else if (initial.stW || initial.stH) {
      // First visit via an old ?size= link: honor it once, then it persists.
      setSettings((s) => ({ ...s, stW: initial.stW ?? s.stW, stH: initial.stH ?? s.stH }));
    }
    try { setBatch(loadBatch()); } catch { /* private mode */ }
    setBatchReady(true);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(LS_KEY, JSON.stringify(settings)); } catch { /* private mode */ }
  }, [settings, ready]);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setSettings((s) => ({ ...s, [k]: v }));
  const toggle = (k: keyof Show) =>
    setSettings((s) => ({ ...s, show: { ...s.show, [k]: !s.show[k] } }));

  const lot = lots.find((l) => String(l.id) === lotId) ?? lots[0];

  // Batch queue (snapshots: labels are point-in-time, prices confirmed at print).
  const saveBatch = (next: BatchItem[]) => {
    setBatch(next);
    try { window.localStorage.setItem(BATCH_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  };
  const batchTotal = batch.reduce((s, b) => s + b.copies, 0);
  const batchMode = batch.length > 0;
  const isRoll = settings.paper === "roll80" || settings.paper === "roll58";
  const paperW = settings.paper === "roll80" ? 80 : settings.paper === "roll58" ? 58
    : settings.paper === "a4" ? (settings.orient === "portrait" ? 210 : 297)
    : settings.paperW;
  const paperH = settings.paper === "a4"
    ? (settings.orient === "portrait" ? 297 : 210)
    : settings.paper === "custom" ? settings.paperH : 0;

  const cols = Math.max(1, Math.floor((paperW - settings.padX * 2 + settings.gapX) / (settings.stW + settings.gapX)));
  const rowsPerSheet = isRoll ? 0 : Math.max(1, Math.floor((paperH - settings.padY * 2 + settings.gapY) / (settings.stH + settings.gapY)));
  const rows = isRoll ? Math.ceil(copies / cols) : rowsPerSheet;
  const perSheet = isRoll ? copies : cols * rowsPerSheet;
  const sheetCount = isRoll ? 1 : Math.max(1, Math.ceil(copies / Math.max(1, perSheet)));
  const totalH = isRoll ? rows * settings.stH + Math.max(0, rows - 1) * settings.gapY + settings.padY * 2 : paperH;

  const pageW = paperW;
  const pageH = isRoll ? Math.max(20, Math.round(totalH)) : paperH;
  const pageSize = settings.paper === "a4"
    ? `A4 ${settings.orient}`
    : `${pageW}mm ${pageH}mm`;

  const qrPx = Math.max(24, Math.min(96, Math.round(settings.stW * 3.78 * 0.7)));
  const barH = Math.max(20, Math.min(56, Math.round(settings.stH * 3.78 * 0.35)));

  const sticker = (key: number | string, prod?: Prod, lotRow?: Lot | undefined) => {
    const pd = prod ?? product;
    const lr = lotRow === undefined ? lot : lotRow;
    return (
    <div key={key}
      className="flex flex-col items-center justify-center overflow-hidden border border-dashed border-black/40 bg-white text-center text-black print:border-black/30"
      style={{ width: `${settings.stW}mm`, height: `${settings.stH}mm`, padding: "1mm" }}>
      {settings.show.name && <p className="w-full truncate text-[9px] font-bold leading-tight">{pd.name}</p>}
      {(settings.show.pid || settings.show.sku) && (
        <p className="font-mono text-[8px] leading-tight text-zinc-700">
          {settings.show.pid ? `#${pd.id}` : ""}{settings.show.pid && settings.show.sku ? " · " : ""}{settings.show.sku ? pd.sku || "" : ""}
        </p>
      )}
      {(settings.show.price || settings.show.mrp) && (
        <p className="text-[11px] font-extrabold leading-tight">
          {settings.show.price ? `₹${(pd.price / 100).toFixed(0)}` : ""}
          {settings.show.price && settings.show.mrp && pd.mrp > pd.price ? <span className="ml-1 text-[8px] font-normal text-zinc-500 line-through">₹{(pd.mrp / 100).toFixed(0)}</span>
            : settings.show.mrp && !settings.show.price && pd.mrp > 0 ? `MRP ₹${(pd.mrp / 100).toFixed(0)}` : ""}
        </p>
      )}
      {(mode === "both" || mode === "qr" || mode === "barcode") && (settings.show.qr || settings.show.barcode) && (
        <div className="mt-0.5 flex max-w-full items-center justify-center gap-1 overflow-hidden">
          {(mode === "both" || mode === "qr") && settings.show.qr && <QrImg text={pd.barcode || String(pd.sku || pd.name)} size={qrPx} />}
          {(mode === "both" || mode === "barcode") && settings.show.barcode && <EanBars code={pd.barcode} height={barH} />}
        </div>
      )}
      {settings.show.batch && lr && (lr.lot || lr.mfg || lr.exp) && (
        <p className="text-[8px] leading-tight text-zinc-700">{lr.lot ? `B:${lr.lot} ` : ""}{lr.mfg ? `M:${lr.mfg} ` : ""}{lr.exp ? `E:${lr.exp}` : ""}</p>
      )}
    </div>
    );
  };

  // Print run: batch mode flattens queued items to per-copy units (capped);
  // single mode keeps the current product × copies behavior.
  const units: { prod: Prod; lotRow: Lot | undefined }[] = batchMode
    ? (() => {
        const out: { prod: Prod; lotRow: Lot | undefined }[] = [];
        for (const b of batch) {
          for (let i = 0; i < b.copies && out.length < BATCH_CAP; i++) {
            out.push({
              prod: { id: b.id, name: b.name, price: b.price, mrp: b.mrp, barcode: b.barcode, sku: b.sku },
              lotRow: undefined,
            });
          }
        }
        return out;
      })()
    : Array.from({ length: Math.min(999, copies) }, () => ({ prod: product, lotRow: lot }));
  const runTotal = batchMode ? units.length : copies;
  const runRows = isRoll ? Math.ceil(runTotal / cols) : rowsPerSheet;
  const runPerSheet = isRoll ? runTotal : cols * rowsPerSheet;
  const runSheets = isRoll ? 1 : Math.max(1, Math.ceil(runTotal / Math.max(1, runPerSheet)));
  const runTotalH = isRoll ? runRows * settings.stH + Math.max(0, runRows - 1) * settings.gapY + settings.padY * 2 : paperH;

  const sheets: { from: number; n: number }[] = [];
  {
    let left = runTotal;
    for (let i = 0; i < runSheets; i++) {
      const n = isRoll ? runTotal : Math.min(left, runPerSheet);
      sheets.push({ from: runTotal - left, n });
      left -= n;
    }
  }

  const mmField = (label: string, value: number, onV: (n: number) => void, lo: number, hi: number, step = 1) => (
    <label className="grid min-w-0 flex-1 gap-0.5 text-xs font-semibold">{label} (mm)
      <input value={String(value)} inputMode="decimal" onChange={(e) => onV(num(e.target.value, value, lo, hi))}
        className="min-h-[44px] min-w-0 rounded-xl border border-black/15 bg-transparent px-2 font-mono dark:border-white/20" />
    </label>
  );

  return (
    <div>
      <style>{`@media print {
        @page { size: ${pageSize}; margin: 0; }
        body { background: #fff !important; }
        nav[aria-label="Admin"], .impersonate-bar { display: none !important; }
        .wrap { max-width: none !important; padding: 0 !important; margin: 0 !important; }
      }`}</style>

      <div className="flex flex-wrap items-center gap-1.5 print:hidden" role="tablist" aria-label="Label studio views">
        {(["print", "batch", "settings"] as const).map((v) => (
          <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
            className={`flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold ${view === v ? "bg-black text-white dark:bg-white dark:text-black" : "border border-black/15 dark:border-white/20"}`}>
            {v === "print" ? `Preview & print × ${runTotal}${batchMode ? " (batch)" : ""}` : v === "batch" ? `Batch (${batchTotal})` : "Paper & content"}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1.5">
          <button onClick={() => window.print()}
            className="flex min-h-[44px] items-center rounded-xl bg-brand px-5 text-sm font-bold text-white">Print</button>
          <Link href="/admin/shop" className="flex min-h-[44px] items-center rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Back</Link>
        </span>
      </div>

      {view === "batch" && batchReady && (
        <div className="mt-3 grid gap-2 print:hidden">
          <section className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
            <p className="font-bold">Batch queue <span className="text-xs font-normal text-zinc-500">(snapshots on this device · prices as of adding)</span></p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                onClick={() => {
                  if (batch.some((b) => b.id === product.id)) { saveBatch(batch.map((b) => (b.id === product.id ? { ...b, copies: Math.min(999, b.copies + copies) } : b))); return; }
                  saveBatch([...batch, {
                    id: product.id, name: product.name, price: product.price, mrp: product.mrp,
                    barcode: product.barcode, sku: product.sku, copies: Math.min(999, Math.max(1, copies)),
                  }].slice(0, 50));
                }}
                className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white">
                + Add this product × {copies}</button>
              {batch.length > 0 && (
                <button onClick={() => saveBatch([])}
                  className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Clear batch</button>
              )}
            </div>
            {batch.length === 0 ? <p className="mt-2 text-sm text-zinc-500">Empty — print view uses this product alone until you queue items.</p> : (
              <ul className="mt-2 space-y-1 text-sm">
                {batch.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                    <span className="min-w-0 flex-1 truncate">{b.name} · ₹{(b.price / 100).toFixed(0)}</span>
                    <span className="flex items-center gap-1">
                      <button onClick={() => saveBatch(batch.map((x) => (x.id === b.id ? { ...x, copies: Math.max(1, x.copies - 1) } : x)))} aria-label={`Fewer ${b.name} labels`}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/15 dark:border-white/20">−</button>
                      <span className="w-12 text-center font-mono font-bold" aria-live="polite">× {b.copies}</span>
                      <button onClick={() => saveBatch(batch.map((x) => (x.id === b.id ? { ...x, copies: Math.min(999, x.copies + 1) } : x)))} aria-label={`More ${b.name} labels`}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/15 dark:border-white/20">+</button>
                      <button onClick={() => saveBatch(batch.filter((x) => x.id !== b.id))} aria-label={`Remove ${b.name}`}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/15 dark:border-white/20">✕</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-xs text-zinc-500">Total {batchTotal} labels · print tab renders the combined run in queue order.</p>
          </section>
        </div>
      )}

      {view === "settings" && (
        <div className="mt-3 grid gap-3 print:hidden">
          <section className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
            <p className="font-bold">Paper <span className="text-xs font-normal text-zinc-500">(saved on this device)</span></p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(["roll80", "roll58", "a4", "custom"] as const).map((pp) => (
                <button key={pp} onClick={() => set("paper", pp)} aria-pressed={settings.paper === pp}
                  className={`min-h-[44px] rounded-xl border px-3 text-sm font-semibold ${settings.paper === pp ? "border-black bg-black text-white dark:bg-white dark:text-black" : "border-black/15 dark:border-white/20"}`}>
                  {pp === "roll80" ? "Roll 80mm" : pp === "roll58" ? "Roll 58mm" : pp === "a4" ? "A4 sheet" : "Custom"}
                </button>
              ))}
              {(settings.paper === "a4" || settings.paper === "custom") && (
                <button onClick={() => set("orient", settings.orient === "portrait" ? "landscape" : "portrait")} aria-pressed={settings.orient === "landscape"}
                  className="min-h-[44px] rounded-xl border border-black/15 px-3 text-sm font-semibold dark:border-white/20">{settings.orient}</button>
              )}
            </div>
            {settings.paper === "custom" && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {mmField("Page width", settings.paperW, (n) => set("paperW", n), 20, 500)}
                {mmField("Page height", settings.paperH, (n) => set("paperH", n), 20, 500)}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {mmField("Side margin", settings.padX, (n) => set("padX", n), 0, 50, 0.5)}
              {mmField("Top margin", settings.padY, (n) => set("padY", n), 0, 50, 0.5)}
              {mmField("Gap across", settings.gapX, (n) => set("gapX", n), 0, 20, 0.5)}
              {mmField("Gap down", settings.gapY, (n) => set("gapY", n), 0, 20, 0.5)}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {isRoll ? `Roll ${paperW}mm · ${cols} across · ${runRows} rows · ${Math.round(runTotalH)}mm long · zero waste (exact length).`
                : `A4 ${settings.orient} · ${cols} × ${rowsPerSheet} = ${runPerSheet} per sheet · ${runSheets} sheet${runSheets === 1 ? "" : "s"} for ${runTotal}${batchMode ? " (batch)" : ""}.`}
            </p>
          </section>

          <section className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
            <p className="font-bold">Sticker size</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(STICKER_PRESETS).map(([k, s]) => (
                <button key={k} onClick={() => { set("stW", s.w); set("stH", s.h); }}
                  aria-pressed={settings.stW === s.w && settings.stH === s.h}
                  className={`min-h-[44px] rounded-xl border px-3 text-xs ${settings.stW === s.w && settings.stH === s.h ? "border-black bg-black text-white dark:bg-white dark:text-black" : "border-black/15 dark:border-white/20"}`}>{s.label}</button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {mmField("Width", settings.stW, (n) => set("stW", n), 10, 200, 0.5)}
              {mmField("Height", settings.stH, (n) => set("stH", n), 10, 200, 0.5)}
            </div>
          </section>

          <section className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
            <p className="font-bold">Label content</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(["both", "qr", "barcode"] as const).map((m) => (
                <button key={m} onClick={() => set("mode", m)} aria-pressed={settings.mode === m}
                  className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold uppercase ${settings.mode === m ? "border-black bg-black text-white dark:bg-white dark:text-black" : "border-black/15 dark:border-white/20"}`}>{m}</button>
              ))}
            </div>
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {(Object.keys(settings.show) as (keyof Show)[]).map((k) => (
                <label key={k} className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-black/10 px-3 text-sm dark:border-white/10">
                  <input type="checkbox" checked={settings.show[k]} onChange={() => toggle(k)} className="h-5 w-5" />
                  {k === "pid" ? "Product ID" : k === "qr" ? "QR code" : k === "mrp" ? "MRP" : k[0].toUpperCase() + k.slice(1)}
                </label>
              ))}
            </div>
          </section>
          <button onClick={() => { try { window.localStorage.removeItem(LS_KEY); } catch { /* ignore */ } setSettings(DEFAULTS); }}
            className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Reset paper & content defaults</button>
        </div>
      )}

      {view === "print" && (
        <div className="mt-3">
          <div className="flex flex-wrap items-end gap-1.5 print:hidden">
            <label className="grid gap-0.5 text-xs font-semibold">Stickers
              <input value={String(copies)} inputMode="numeric" onChange={(e) => setCopies(num(e.target.value, copies, 1, 999))}
                className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 font-mono text-sm dark:border-white/20" />
            </label>
            {lots.length > 0 && (
              <label className="grid min-w-0 flex-1 gap-0.5 text-xs font-semibold">Batch
                <select value={lotId} onChange={(e) => setLotId(e.target.value)}
                  className="min-h-[44px] min-w-0 rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
                  <option value="">Latest</option>
                  {lots.map((l) => <option key={l.id} value={String(l.id)}>{l.lot || `#${l.id}`} · exp {l.exp || "—"}</option>)}
                </select>
              </label>
            )}
            <p className="w-full text-xs text-zinc-500">Preview below is the print grid, same sheets, same order — what you see is what the printer gets.</p>
          </div>
          <div className="mt-2 grid gap-4 overflow-x-auto pb-2">
            {sheets.map(({ from, n }, si) => (
              <div key={si} className="bg-white shadow-sm" style={{
                width: `${pageW}mm`,
                ...(isRoll ? { height: `${Math.round(runTotalH)}mm` } : { minHeight: `${paperH}mm` }),
                padding: `${settings.padY}mm ${settings.padX}mm`,
                breakAfter: si === sheets.length - 1 ? "auto" : "page",
              }}>
                {settings.paper === "a4" && (
                  <p className="mb-1 font-mono text-[9px] text-zinc-400 print:hidden">Sheet {si + 1}/{sheets.length} · A4 {settings.orient}</p>
                )}
                <div className="grid" style={{
                  gridTemplateColumns: `repeat(${cols}, ${settings.stW}mm)`,
                  gap: `${settings.gapY}mm ${settings.gapX}mm`,
                  justifyContent: "start", alignContent: "start",
                }}>
                  {Array.from({ length: n }).map((_, i) => {
                    const u = units[from + i];
                    return sticker(`${si}-${i}`, u?.prod, u?.lotRow);
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
