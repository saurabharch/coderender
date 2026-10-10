"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DatePickerInput } from "@mantine/dates";
import { Camera, Copy, Plus, ScanBarcode, Tag } from "lucide-react";
import { AdminCard, Empty, Skeleton } from "@/components/admin-ui";
import { NoSsr } from "@/components/no-ssr";
import { WasmScanDialog } from "@/components/wasm-scan-dialog";
import { notifications } from "@mantine/notifications";
import { ProductPicker } from "@/components/product-picker";
import { CollapsibleCard, CopyBtn, IconBtn, JobProgress, StatusBadge } from "@/components/admin-ux";
import { maskAmount, maskBarcode, maskInt, maskPercent, maskUpper } from "@/lib/mask";

interface Product { id: number; name: string; sku: string; price: number; stock: number; status: string; category: string; ratingAvg: number; ratingCount: number; vcount: number }
interface Order { id: number; status: string; grand: number; coupon: string; createdAt: string }
interface Coupon { code: string; kind: string; value: number; active: number }

export function ShopConsole() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  interface QuoteRow { id: number; no: string; status: string; version: number; grand: number; validUntil: string; acceptedOrderId: number }
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [qlines, setQlines] = useState<{ pid: string; qty: string }[]>([{ pid: "", qty: "1" }]);
  const [qcust, setQcust] = useState("");
  const [qedit, setQedit] = useState<number | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [stock, setStock] = useState("");
  const [barcode, setBarcode] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [imgurls, setImgurls] = useState("");
  const [pending, setPending] = useState<{ file: File; url: string } | null>(null);
  const [jobprog, setJobprog] = useState<{ done: number; total: number; label: string } | null>(null);
  const addPhotoRef = useRef<HTMLInputElement>(null);
  const [vpid, setVpid] = useState("");
  const [vname, setVname] = useState("");
  const [vsize, setVsize] = useState("");
  const [vcolor, setVcolor] = useState("");
  const [vunit, setVunit] = useState("pc");
  const [vtype, setVtype] = useState("weight");
  const [vval, setVval] = useState("");
  const [variety, setVariety] = useState(false);
  const [matrix, setMatrix] = useState(false);
  const [mcolors, setMcolors] = useState("");
  const [msizes, setMsizes] = useState("");
  const [excluded, setExcluded] = useState<string[]>([]);
  const [existing, setExisting] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [mtype, setMtype] = useState("weight");
  const [mval, setMval] = useState("");
  const [munit, setMunit] = useState("pc");
  const [mcolor, setMcolor] = useState("");
  const [msize, setMsize] = useState("");
  const [ccode, setCcode] = useState("");
  const [ckind, setCkind] = useState("pct");
  const [cval, setCval] = useState("");
  const [eid, setEid] = useState("");
  const [ename, setEname] = useState("");
  const [eprice, setEprice] = useState("");
  const [estock, setEstock] = useState("");
  const [photoid, setPhotoid] = useState<number | null>(null);
  const [transparent, setTransparent] = useState(true);
  const photoInputRef = useRef<HTMLInputElement>(null);

  function snap(pid: number) {
    setPhotoid(pid);
    // Let state settle, then open the camera picker.
    setTimeout(() => photoInputRef.current?.click(), 50);
  }
  const [slides, setSlides] = useState<{ id: number; title: string; anim: string; active: number }[]>([]);
  const [stitle, setStitle] = useState("");
  const [sanim, setSanim] = useState("slide");
  const [lots, setLots] = useState<{ id: number; lot: string; mfg: string; exp: string; qty: number; cost: number; sell: number }[]>([]);
  const [lotpid, setLotpid] = useState("");
  const [lotno, setLotno] = useState("");
  const [lotmfg, setLotmfg] = useState<Date | null>(null);
  const [lotexp, setLotexp] = useState<Date | null>(null);
  const [lotcost, setLotcost] = useState("");
  const [lotsell, setLotsell] = useState("");
  const [lotq, setLotq] = useState("");
  const [lotscan, setLotscan] = useState(false);
  const [lotfound, setLotfound] = useState<{ id: number; lot: string; mfg: string; exp: string; pname: string; pid: number; barcode: string; images: string; stock: number; sold: number }[]>([]);
  const [pxpid, setPxpid] = useState("");
  const [pxtype, setPxtype] = useState("sale");
  const [pxamt, setPxamt] = useState("");
  const [prices, setPrices] = useState<{ id: number; priceType: string; amount: number }[]>([]);
  const [channels, setChannels] = useState<Record<string, { enabled: boolean }>>({});

  async function load() {
    const [p, o, c, h, q] = await Promise.all([
      fetch("/api/shop/products").then((r) => r.json()).catch(() => null),
      fetch("/api/shop/orders").then((r) => r.json()).catch(() => null),
      fetch("/api/shop/quotes").then((r) => r.json()).catch(() => null),
      fetch("/api/shop/pricing").then((r) => r.json()).catch(() => null),
      fetch("/api/finance?view=hero").then((r) => r.json()).catch(() => null),
    ]);
    if (p?.products) setProducts(p.products);
    if (o?.orders) setOrders(o.orders);
    if (q?.quotes) setQuotes(q.quotes);
    if (c?.coupons) setCoupons(c.coupons);
    if (h?.slides) setSlides(h.slides);
    setLoaded(true);
  }

  useEffect(() => { void load(); }, []);

  const MEASURE_TYPES = ["weight", "volume", "length", "count", "pack"];

  async function addProduct() {
    if (!stock || Number(stock) < 1 || !Number.isInteger(Number(stock))) { setMsg("Stock: whole numbers from 1."); return; }
    const res = await fetch("/api/shop/products", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, stock: Math.round(Number(stock)), ...(barcode.trim() ? { barcode: barcode.trim() } : {}),
      ...(imgurls.trim() ? { images: imgurls.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10) } : {}) }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg("Add failed"); return; }
    // First measurement variant rides along (price lives on the batch).
    const vattrs = { kind: mtype, ...(mval.trim() ? { value: mval.trim() } : {}), unit: munit,
      ...(mcolor.trim() ? { color: mcolor.trim() } : {}), ...(msize.trim() ? { size: msize.trim() } : {}) };
    if (mval.trim() || mcolor.trim() || msize.trim()) {
      await fetch("/api/shop/products", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: d.id,
          name: `${mval.trim()} ${munit}`.trim() || "Standard",
          attrs: vattrs,
        }),
      }).catch(() => null);
    }
    setVpid(String(d.id));
    // Pending capture (camera button below): upload + attach + queue bg job.
    if (pending) {
      try {
        const form = new FormData();
        form.append("file", pending.file, "photo.png");
        form.append("productId", String(d.id));
        const up = await fetch("/api/media/upload", { method: "POST", body: form });
        const u = await up.json().catch(() => ({}));
        if (up.ok && transparent) {
          const q = await fetch("/api/media/bgremove", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assetId: u.id, productId: d.id }),
          }).then((r) => r.json()).catch(() => null);
          if (q?.ok) { void runClientWorker(u.url, q.id); void pollJob(q.id); }
        }
        setMsg(up.ok ? "Product added ✓ + photo attached" : "Product added ✓ (photo failed)");
      } catch {
        setMsg("Product added ✓ (photo failed)");
      }
      URL.revokeObjectURL(pending.url);
      setPending(null);
    } else {
      setMsg("Product added ✓ (auto-barcode when left blank)");
    }
    setName(""); setStock(""); setBarcode(""); setImgurls(""); setMval(""); setMcolor(""); setMsize(""); void load();
  }

  async function addVariant() {
    if (!vpid) { setMsg("Pick the product first (auto-filled on add)."); return; }
    const res = await fetch("/api/shop/products", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: Number(vpid),
        name: vname.trim() || `${vval.trim()} ${vunit}`.trim() || "Standard",
        attrs: { kind: vtype, ...(vval.trim() ? { value: vval.trim() } : {}), unit: vunit,
          ...(variety && vcolor.trim() ? { color: vcolor.trim() } : {}),
          ...(variety && vsize.trim() ? { size: vsize.trim() } : {}) },
      }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Variant added ✓ (price goes on the batch)" : (d.error ?? "failed"));
    if (res.ok) { setVname(""); setVsize(""); setVcolor(""); setVval(""); setVunit("pc"); setVtype("weight"); setVariety(false); void load(); }
  }

  const comboKey = (c: string, s: string) => `${c} / ${s}`;
  const combos = (() => {
    const cs = mcolors.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 10);
    const ss = msizes.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 10);
    return cs.flatMap((c) => ss.map((s) => ({ c, s }))).slice(0, 50);
  })();
  const skuFor = (c: string, s: string) => {
    const clean = (x: string) => x.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "X";
    return `P${vpid || 0}-${clean(c)}-${clean(s)}`;
  };

  async function previewMatrix() {
    if (!vpid) { setMsg("Pick the product first (auto-filled on add)."); return; }
    const d = await fetch(`/api/shop/products?id=${encodeURIComponent(vpid)}`).then((r) => r.json()).catch(() => null);
    const have = new Set(((d?.variants ?? []) as { name: string }[]).map((v) => v.name));
    setExisting([...have]);
    setExcluded(combos.filter((k) => have.has(comboKey(k.c, k.s))).map((k) => comboKey(k.c, k.s)));
  }

  async function generateMatrix() {
    const todo = combos.filter((k) => !excluded.includes(comboKey(k.c, k.s)));
    if (!vpid || todo.length === 0) { setMsg("Nothing to generate — check boxes."); return; }
    setGenerating(true);
    let n = 0;
    for (const k of todo) {
      const res = await fetch("/api/shop/products", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: Number(vpid), name: comboKey(k.c, k.s), sku: skuFor(k.c, k.s),
          attrs: { kind: vtype, unit: vunit, color: k.c, size: k.s },
        }),
      }).catch(() => null);
      if (res && (res as Response).ok) n++;
      setMsg(`Matrix ${n}/${todo.length}…`);
    }
    setGenerating(false);
    setMsg(`Matrix done ✓ ${n} variants`);
    void load();
  }

  const quoteLines = () => qlines
    .filter((l) => l.pid && Number(l.qty) > 0)
    .map((l) => ({ productId: Number(l.pid), qty: Number(l.qty) }));

  function quoteNext(status: string): string[] {
    return status === "draft" ? ["sent"]
      : status === "sent" ? ["approved", "rejected", "expired"]
      : status === "approved" ? ["expired"] : [];
  }

  async function quoteSave(editId: number | null) {
    const lines = quoteLines();
    if (!lines.length) { setMsg("Add at least one line."); return; }
    const body = editId === null
      ? { op: "create", lines, ...(qcust.trim() ? { customerId: Number(qcust) } : {}) }
      : { op: "revise", id: editId, lines };
    const res = await fetch("/api/shop/quotes", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? (editId === null ? `Quoted ${d.quote?.no ?? ""} ✓` : `Saved v${d.version} ✓`) : (d.error ?? "failed"));
    if (res.ok) { setQlines([{ pid: "", qty: "1" }]); setQcust(""); setQedit(null); void load(); }
  }

  async function quoteLoad(id: number) {
    const d = await fetch(`/api/shop/quotes?id=${id}`).then((r) => r.json()).catch(() => null);
    const q = d?.quote;
    if (!q) { setMsg("quote gone"); return; }
    const cur = (q.lines as { productId: number; qty: number; version: number }[]).filter((l) => l.version === q.version);
    setQlines(cur.map((l) => ({ pid: String(l.productId), qty: String(l.qty) })));
    setQedit(id);
    setMsg(`Revising ${q.no} (currently v${q.version}) — saving writes a new version.`);
  }

  async function quoteMove(id: number, to: string) {
    const res = await fetch("/api/shop/quotes", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "status", id, to }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Quote ${to} ✓` : (d.error ?? "failed"));
    if (res.ok) void load();
  }

  async function quoteAcceptGo(id: number) {
    const res = await fetch("/api/shop/quotes", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "accept", id }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Accepted → order #${d.orderId} ✓` : (d.error ?? "failed"));
    if (res.ok) void load();
  }

  async function addCoupon() {
    const res = await fetch("/api/shop/pricing", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: ccode, kind: ckind, value: ckind === "pct" ? Number(cval) : Math.round(Number(cval) * 100) }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Coupon saved ✓" : (d.error ?? "failed"));
    if (res.ok) { setCcode(""); setCval(""); void load(); }
  }

  async function quickEdit() {
    const body: Record<string, unknown> = { id: Number(eid), name: "x" };
    // Name is required by the schema; fetch the real one first (merge keeps the rest).
    const cur = products.find((p) => p.id === Number(eid));
    if (!cur) { setMsg("unknown product id"); return; }
    Object.assign(body, { name: ename.trim() || cur.name });
    if (eprice) body.price = Math.round(Number(eprice) * 100);
    if (estock) body.stock = Math.round(Number(estock));
    const res = await fetch("/api/shop/products", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Updated ✓ (other fields kept)" : (d.error ?? "failed"));
    if (res.ok) { setEid(""); setEname(""); setEprice(""); setEstock(""); void load(); }
  }

  // Client WASM worker: same job id as the server job — first swap wins.
  async function runClientWorker(imageUrl: string, jobId: number) {
    try {
      const worker = new Worker("/bg-worker.mjs", { type: "module" });
      const done = new Promise<void>((resolve) => {
        worker.onmessage = async (e: MessageEvent<{ ok: boolean; jobId: number; bytes?: ArrayBuffer; error?: string }>) => {
          try {
            if (e.data?.ok && e.data.bytes) {
              const form = new FormData();
              form.append("jobId", String(e.data.jobId));
              form.append("file", new Blob([e.data.bytes], { type: "image/png" }), "nobg.png");
              const r = await fetch("/api/media/bgdone", { method: "POST", body: form });
              const d = await r.json().catch(() => ({}));
              if (r.ok) setMsg(`Transparent image live ✓ (${d.url})`);
            }
          } catch { /* server job may have won — fine */ }
          worker.terminate();
          resolve();
        };
        worker.onerror = () => { worker.terminate(); resolve(); };
      });
      worker.postMessage({ imageUrl, jobId });
      await done;
    } catch { /* server job covers it */ }
  }

  // Job progress: poll until the worker/swap settles, then chime + notify.
  async function pollJob(jobId: number) {
    const { chime } = await import("@/lib/chime");
    for (let i = 0; i < 24; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const d = await fetch(`/api/media/bgremove?id=${jobId}`).then((r) => r.json()).catch(() => null);
      if (!d || d.status === "queued" || d.status === "working") {
        setJobprog({ done: i + 1, total: 24, label: `Transparent job #${jobId}: ${d?.status ?? "…"}` });
        continue;
      }
      setJobprog(null);
      if (d.status === "done") {
        chime("success");
        setMsg(`Transparent image live ✓`);
        void load();
      } else {
        chime("warn");
        setMsg(`Background job ${d.status}: ${d.note ?? ""} — original kept`.slice(0, 160));
      }
      return;
    }
    setJobprog(null);
    setMsg("Still working — check back in a bit (Notifications will confirm).");
  }

  async function capturePhoto(productId: number, file: File | undefined) {    if (!file) return;
    const src: Blob = file;
    setMsg("Uploading original…");
    // Low-memory decode ladder: full decode first (best quality), then
    // single-step decode+scale (much lower peak memory), then tiny.
    // A 12MP camera frame decodes to ~48MB — that alone OOMs cheap phones.
    async function decode(maxEdge: number, direct: boolean): Promise<ImageBitmap> {
      if (direct) {
        const bmp = await createImageBitmap(src);
        const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
        if (scale >= 1) return bmp;
        const small = await createImageBitmap(bmp, {
          resizeWidth: Math.round(bmp.width * scale),
          resizeHeight: Math.round(bmp.height * scale),
          resizeQuality: "high",
        });
        bmp.close();
        return small;
      }
      // One step: decode already scaled (peak ≈ output size, not sensor size).
      return await createImageBitmap(src, { resizeWidth: maxEdge, resizeQuality: "high" } as ImageBitmapOptions);
    }
    let stage = "reading";
    try {
      let bmp: ImageBitmap | null = null;
      let lastErr: unknown = null;
      for (const [edge, direct] of [[1280, true], [1280, false], [800, false]] as const) {
        try {
          bmp = await decode(edge, direct);
          break;
        } catch (e) { lastErr = e; }
      }
      if (!bmp) throw lastErr ?? new Error("decode");
      stage = "encoding";
      let blob: Blob = file;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = bmp.width;
        canvas.height = bmp.height;
        canvas.getContext("2d")!.drawImage(bmp, 0, 0);
        blob = await new Promise<Blob>((res, rej) =>
          canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.8)) ?? blob;
      } finally {
        bmp.close();
      }
      // Upload the ORIGINAL immediately — fast, selling never waits.
      const form = new FormData();
      form.append("file", blob, "photo.png");
      form.append("productId", String(productId));
      const res = await fetch("/api/media/upload", { method: "POST", body: form });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(d.error ?? "upload failed");
        return;
      }
      // Background removal runs as a job; the transparent copy swaps in
      // automatically and the DB updates itself — zero counter load.
      if (transparent) {
        const q = await fetch("/api/media/bgremove", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetId: d.id, productId }),
        }).then((r) => r.json()).catch(() => null);
        if (q?.ok) {
          setMsg(`Photo live ✓ — transparent version swaps in automatically (job #${q.id})`);
          // Client WASM worker races the server job on the same job id;
          // first swap wins, the loser no-ops. Works on-device browsers.
          void runClientWorker(d.url, q.id);
        } else {
          setMsg(`Photo attached ✓ (${d.via})`);
        }
      } else {
        setMsg(`Photo attached ✓ (${d.via})`);
      }
      void load();
    } catch {
      setMsg(stage === "reading"
        ? "Photo too large for this phone (low memory) — lower the camera resolution or pick an existing smaller photo."
        : "Photo failed — try again or use an image URL.");
    }
    setPhotoid(null);
  }

  async function addSlide() {
    const res = await fetch("/api/finance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "slide", title: stitle, anim: sanim }),
    });
    setMsg(res.ok ? "Slide added ✓" : "failed");
    if (res.ok) { setStitle(""); void load(); }
  }

  async function delSlide(id: number) {
    await fetch("/api/finance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "slide-del", id }),
    }).catch(() => {});
    void load();
  }

  async function loadLots(forceId?: string) {
    const pid = forceId ?? lotpid;
    if (!pid) { setLots([]); return; }
    const d = await fetch(`/api/shop/lots?productId=${encodeURIComponent(pid)}`).then((r) => r.json()).catch(() => null);
    if (d?.lots) setLots(d.lots);
  }

  async function loadPrices(forceId?: string) {
    const pid = forceId ?? pxpid;
    if (!pid) { setPrices([]); setChannels({}); return; }
    const [p, c] = await Promise.all([
      fetch(`/api/shop/pricing?what=prices&productId=${encodeURIComponent(pid)}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/shop/pricing?what=channels&productId=${encodeURIComponent(pid)}`).then((r) => r.json()).catch(() => null),
    ]);
    if (p?.prices) setPrices(p.prices);
    if (c?.channels) setChannels(c.channels);
  }

  async function addPrice() {
    const res = await fetch("/api/shop/pricing", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ what: "price", productId: Number(pxpid), priceType: pxtype, amount: Math.round(Number(pxamt) * 100) }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Price saved ✓" : (d.error ?? "failed"));
    if (res.ok) { setPxamt(""); void loadPrices(); }
  }

  async function flipChannel(ch: string) {
    const cur = channels[ch]?.enabled !== false;
    const res = await fetch("/api/shop/pricing", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ what: "channel", productId: Number(pxpid), channel: ch, enabled: !cur }),
    });
    if (res.ok) void loadPrices();
    else setMsg("channel failed");
  }

  const day = (d: Date | null) => (d ? d.toISOString().slice(0, 7) : "");

  async function addLot() {
    const res = await fetch("/api/shop/lots", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: Number(lotpid), lot: lotno, mfg: day(lotmfg), exp: day(lotexp),
        cost: Math.round(Number(lotcost || 0) * 100), sell: Math.round(Number(lotsell || 0) * 100) }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Batch saved ✓" : (d.error ?? "failed"));
    if (res.ok) { setLotno(""); setLotmfg(null); setLotexp(null); setLotcost(""); setLotsell(""); void loadLots(); }
  }

  async function searchLot() {
    if (lotq.trim().length < 2) { setLotfound([]); return; }
    const d = await fetch(`/api/shop/lots?lot=${encodeURIComponent(lotq.trim())}`).then((r) => r.json()).catch(() => null);
    if (d?.lots) setLotfound(d.lots);
  }

  // Scan a barcode → resolve the product → select it for mfg/exp update.
  async function scanLot(code: string) {
    setLotscan(false);
    const d = await fetch(`/api/shop/scan?code=${encodeURIComponent(code.trim())}`).then((r) => r.json()).catch(() => null);
    if (d?.ok) {
      setLotpid(String(d.productId));
      setMsg(`Selected ${d.name} ✓ — set dates below`);
      const l = await fetch(`/api/shop/lots?productId=${d.productId}`).then((r) => r.json()).catch(() => null);
      if (l?.lots) setLots(l.lots);
    } else setMsg(`No product for ${code}`);
  }

  async function move(id: number, to: string) {
    const res = await fetch("/api/shop/orders", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, to }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Order #${id} → ${to} ✓` : (d.error ?? "move failed"));
    if (res.ok) void load();
  }

  if (!loaded) return <Skeleton lines={5} />;
  return (
    <div className="grid gap-3">
      <AdminCard>
        <p className="font-bold">Add product <span className="text-xs font-normal text-zinc-500">(measure + stock — price goes on the batch)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={150}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={stock} onChange={(e) => setStock(maskInt(e.target.value))} placeholder="Stock" inputMode="numeric"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <select value={mtype} onChange={(e) => setMtype(e.target.value)} aria-label="Measurement type"
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
            {MEASURE_TYPES.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input value={mval} onChange={(e) => setMval(e.target.value)} placeholder="Measure (500)" maxLength={20}
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <select value={munit} onChange={(e) => setMunit(e.target.value)} aria-label="Unit"
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
            {["pc", "kg", "g", "l", "ml", "m", "cm", "box", "dozen", "pack"].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <input value={mcolor} onChange={(e) => setMcolor(e.target.value)} placeholder="Color?" maxLength={20}
            className="min-h-[44px] w-20 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={msize} onChange={(e) => setMsize(e.target.value)} placeholder="Size?" maxLength={20}
            className="min-h-[44px] w-20 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <IconBtn label="Add product" onClick={() => void addProduct()} disabled={!name.trim() || !stock} tone="brand"><Plus size={20} /></IconBtn>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <input ref={addPhotoRef} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Capture product photo"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPending({ file: f, url: URL.createObjectURL(f) });
              e.target.value = "";
            }} />
          <IconBtn label="Capture product photo" hint="Capture photo with camera" onClick={() => addPhotoRef.current?.click()}><Camera size={22} /></IconBtn>
          <input value={barcode} onChange={(e) => setBarcode(maskBarcode(e.target.value))} placeholder="Barcode (blank = auto)" maxLength={40}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 font-mono text-sm dark:border-white/20" />
          <IconBtn label="Scan barcode into this field" hint="Scan with camera" onClick={() => setScanOpen(true)}><ScanBarcode size={22} /></IconBtn>
          {barcode.trim() ? <CopyBtn value={barcode} label="barcode" /> : null}
          <WasmScanDialog open={scanOpen} onClose={() => setScanOpen(false)} title="Scan product barcode"
            onScan={(data) => { setBarcode(data.slice(0, 40)); setScanOpen(false); setMsg(`Scanned ${data} — edit or save the product`); }} />
        </div>
        <p className="mt-1 text-xs text-zinc-500">Photo + barcode attach to the new product on Add.</p>
        {jobprog && <div className="mt-2"><JobProgress done={jobprog.done} total={jobprog.total} label={jobprog.label} /></div>}
        {pending && (
          <div className="mt-2 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pending.url} alt="Pending photo preview" className="h-14 w-14 rounded-xl object-cover" />
            <p className="text-xs text-zinc-500">Photo attaches on Add{transparent ? " + transparent job queues" : ""}.</p>
            <button onClick={() => { URL.revokeObjectURL(pending.url); setPending(null); }}
              className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">Remove</button>
          </div>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Products ({products.length})</p>
        <div className="mt-2 flex flex-wrap items-end gap-1.5">
          <div className="min-w-[140px] flex-1 basis-full sm:basis-0"><ProductPicker value={eid} shortcut="F7" placeholder="Product to edit…" onPick={(x) => setEid(x ? String(x.id) : "")} /></div>
          <input value={ename} onChange={(e) => setEname(e.target.value)} placeholder="Name (blank = keep)" maxLength={150}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={eprice} onChange={(e) => setEprice(maskAmount(e.target.value))} placeholder="₹ new" inputMode="decimal"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={estock} onChange={(e) => setEstock(maskInt(e.target.value))} placeholder="Stock" inputMode="numeric"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void quickEdit()} disabled={!eid}
            className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Update</button>
        </div>
        {products.length === 0 ? <div className="mt-2"><Empty>No products yet — add the first above.</Empty></div> : (
          <ul className="mt-2 space-y-2 text-sm">
            {products.map((p) => (
              <li key={p.id} className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <p className="min-w-0 truncate text-base font-extrabold tracking-tight"><Link href={`/admin/shop/${p.id}`} className="underline-offset-2 hover:underline">#{p.id} {p.name}</Link></p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">
                  {p.sku && <span className="font-mono">{p.sku}</span>}
                  {p.category && <span className="rounded-full bg-black/5 px-2 py-0.5 dark:bg-white/10">{p.category}</span>}
                  {p.ratingCount > 0 && <span className="text-amber-600">★{p.ratingAvg}({p.ratingCount})</span>}
                  {p.vcount > 0 && <span>{p.vcount} variants</span>}
                  <span className="ml-auto text-sm font-extrabold text-zinc-800 dark:text-zinc-100">₹{(p.price / 100).toFixed(0)} · {p.stock} in stock</span>
                </p>
                <p className="mt-1.5 flex flex-wrap gap-1.5">
                  <a href={`/admin/shop/${p.id}/labels`} aria-label={`Print labels for ${p.name}`}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-black/15 text-xs font-semibold dark:border-white/20"><Tag size={16} /> Labels</a>
                  <button onClick={() => snap(p.id)} aria-label={`Photograph ${p.name}`}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-black/15 text-xs font-semibold dark:border-white/20"><Camera size={16} /> Photo</button>
                </p>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <input id="product-photo-input" ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        aria-label="Photograph product"
        onChange={(e) => { const f = e.target.files?.[0]; if (photoid && f) void capturePhoto(photoid, f); e.target.value = ""; }} />
      <label className="mt-1.5 flex min-h-[44px] items-center gap-2 text-sm">
        <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} className="h-5 w-5" />
        Transparent background (background job — photo sells instantly, swap is automatic)
      </label>
      <AdminCard>
        <CollapsibleCard title={`Hero slider (${slides.length})`} meta="(shop theme front)">
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={stitle} onChange={(e) => setStitle(e.target.value)} placeholder="Title" maxLength={120}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <select value={sanim} onChange={(e) => setSanim(e.target.value)}
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
            <option value="slide">slide</option>
            <option value="fade">fade</option>
            <option value="zoom">zoom</option>
          </select>
          <IconBtn label="Add" onClick={() => void addSlide()} disabled={!stitle.trim()} tone="brand"><Plus size={20} /></IconBtn>
        </div>
        {slides.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {slides.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span>#{s.id} {s.title || "(no title)"} · {s.anim} · {s.active ? "on" : "off"}</span>
                <button onClick={() => void delSlide(s.id)}
                  className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">Del</button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-xs text-zinc-500">Tip: paste a media-library URL via Edit — set image per slide with the API (image field).</p>
        </CollapsibleCard>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Batches <span className="text-xs font-normal text-zinc-500">(mfg / expiry per product)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={lotq} onChange={(e) => setLotq(maskBarcode(e.target.value))} onKeyDown={(e) => { if (e.key === "Enter") void searchLot(); }}
            placeholder="Search batch id…" maxLength={40}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 font-mono text-sm dark:border-white/20" />
          <button onClick={() => void searchLot()} disabled={lotq.trim().length < 2}
            className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20 disabled:opacity-40">Find</button>
        </div>
        {lotfound.length > 0 && (
          <ul className="mt-2 space-y-1.5 text-sm">
            {lotfound.map((l) => {
              const img = (JSON.parse(l.images || "[]") as string[])[0];
              return (
                <li key={l.id} className="flex gap-2 rounded-xl border border-black/10 p-2 dark:border-white/10">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={l.pname} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                  ) : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-black/5 text-xs dark:bg-white/10">no img</span>}
                  <div className="min-w-0">
                    <p className="font-bold">#{l.pid} {l.pname}</p>
                    <p className="font-mono text-xs break-all">Batch {l.lot || `#${l.id}`} · {l.barcode || "no barcode"}</p>
                    <p className="text-xs text-zinc-500">MFG {l.mfg || "—"} · EXP {l.exp || "—"} · stock {l.stock} · sold {l.sold}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-2 flex flex-wrap items-end gap-1.5">
          <div className="min-w-[140px] flex-1 basis-full sm:basis-0"><ProductPicker value={lotpid} shortcut="F6" placeholder="Product for batch… (or scan →)"
            onPick={(x) => { setLotpid(x ? String(x.id) : ""); if (x) void loadLots(String(x.id)); }} /></div>
          <IconBtn label="Scan product barcode" onClick={() => setLotscan(true)} tone="dark" large><ScanBarcode size={24} /></IconBtn>
          <WasmScanDialog open={lotscan} onClose={() => setLotscan(false)} title="Scan product for batch"
            onScan={(data) => { void scanLot(data); }} />
        </div>
        <div className="mt-1.5 flex flex-wrap items-end gap-1.5">
          <input value={lotno} onChange={(e) => setLotno(maskBarcode(e.target.value))} placeholder="Batch no" maxLength={40}
            className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={lotcost} onChange={(e) => setLotcost(maskAmount(e.target.value))} placeholder="Cost ₹" inputMode="decimal"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={lotsell} onChange={(e) => setLotsell(maskAmount(e.target.value))} placeholder="Sell ₹" inputMode="decimal"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <NoSsr fallback={<p className="text-sm text-zinc-500">Loading date pickers…</p>}>
          <DatePickerInput value={lotmfg} onChange={(v) => setLotmfg(Array.isArray(v) ? (v[0] as Date ?? null) : (v as Date | null))} label="MFG" valueFormat="YYYY-MM"
            className="w-28 sm:w-32" styles={{ input: { minHeight: 44, borderRadius: 12 } }} />
          <DatePickerInput value={lotexp} onChange={(v) => setLotexp(Array.isArray(v) ? (v[0] as Date ?? null) : (v as Date | null))} label="EXP" valueFormat="YYYY-MM"
            className="w-28 sm:w-32" styles={{ input: { minHeight: 44, borderRadius: 12 } }} />
          </NoSsr>
          <IconBtn label="Save batch" onClick={() => void addLot()} disabled={!lotpid} tone="brand"><Plus size={20} /></IconBtn>
        </div>
        {lots.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {lots.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span className="flex min-w-0 flex-wrap items-center gap-1.5">{l.lot || `#${l.id}`} · MFG {l.mfg || "—"} · EXP {l.exp || "—"} · cost ₹{((l.cost ?? 0) / 100).toFixed(0)} · sell ₹{((l.sell ?? 0) / 100).toFixed(0)}
                  {l.exp ? <StatusBadge status={l.exp < new Date().toISOString().slice(0, 7) ? "expired" : "active"} /> : null}</span>
                {l.lot ? <CopyBtn value={l.lot} label="batch number" /> : null}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Prices & channels <span className="text-xs font-normal text-zinc-500">(tier overrides + where it sells)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <ProductPicker value={pxpid} shortcut="F5" placeholder="Product for prices…"
            onPick={(x) => { setPxpid(x ? String(x.id) : ""); if (x) void loadPrices(String(x.id)); else void loadPrices(""); }} />
          <select value={pxtype} onChange={(e) => setPxtype(e.target.value)}
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
            {["sale", "pos", "online", "wholesale", "marketplace", "member", "retail", "promotional"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input value={pxamt} onChange={(e) => setPxamt(maskAmount(e.target.value))} placeholder="₹" inputMode="decimal"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <IconBtn label="Save price" onClick={() => void addPrice()} disabled={!pxpid || !pxamt} tone="brand"><Plus size={20} /></IconBtn>
        </div>
        {prices.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
            {prices.map((p) => (
              <li key={p.id} className="rounded-full border border-black/15 px-3 py-1.5 dark:border-white/20">
                {p.priceType} ₹{(p.amount / 100).toFixed(0)}
              </li>
            ))}
          </ul>
        )}
        {pxpid && (
          <div className="mt-2 flex flex-wrap gap-1.5 text-sm">
            {["pos", "online", "marketplace", "wholesale"].map((ch) => (
              <button key={ch} onClick={() => void flipChannel(ch)} aria-pressed={channels[ch]?.enabled !== false}
                className={`min-h-[44px] rounded-xl border px-3 font-semibold ${channels[ch]?.enabled === false ? "border-black/15 opacity-50 dark:border-white/20" : "border-brand/50 text-brand-deep"}`}>{ch}</button>
            ))}
          </div>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Orders ({orders.length})</p>
        {orders.length === 0 ? <div className="mt-2"><Empty>No orders yet.</Empty></div> : (
          <ul className="mt-2 space-y-1 text-sm">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span className="flex flex-wrap items-center gap-1.5">#{o.id} · ₹{(o.grand / 100).toFixed(0)} · <StatusBadge status={o.status} />{o.coupon ? ` · ${o.coupon}` : ""}</span>
                <span className="flex gap-1">
                  {(o.status === "draft" ? ["confirmed"] : o.status === "confirmed" ? ["fulfilled", "cancelled"] : o.status === "fulfilled" ? ["returned"] : [] as string[]).map((to) => (
                    <button key={to} onClick={() => void move(o.id, to)}
                      className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">{to}</button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Quotes ({quotes.length}) <span className="text-xs font-normal text-zinc-500">(versioned offers — acceptance mints an order)</span></p>
        <div className="mt-2 grid gap-1.5">
          {qlines.map((l, i) => (
            <div key={i} className="flex flex-wrap gap-1.5">
              <div className="min-w-[140px] flex-1"><ProductPicker value={l.pid} placeholder="Product…" onPick={(x) => setQlines((ss) => ss.map((y, j) => (j === i ? { ...y, pid: x ? String(x.id) : "" } : y)))} /></div>
              <input value={l.qty} onChange={(e) => setQlines((ss) => ss.map((y, j) => (j === i ? { ...y, qty: e.target.value } : y)))} placeholder="Qty" inputMode="decimal"
                className="min-h-[44px] w-20 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
              {qlines.length > 1 && (
                <button onClick={() => setQlines((ss) => ss.filter((_, j) => j !== i))} aria-label="Remove line"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/15 dark:border-white/20">✕</button>
              )}
            </div>
          ))}
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setQlines((ss) => [...ss, { pid: "", qty: "1" }])}
              className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">+ Line</button>
            <input value={qcust} onChange={(e) => setQcust(e.target.value)} placeholder="Customer id (optional)" inputMode="numeric"
              className="min-h-[44px] w-40 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
            {qedit === null ? (
              <button onClick={() => void quoteSave(null)} disabled={!qlines.some((l) => l.pid)}
                className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">New quote</button>
            ) : (
              <>
                <button onClick={() => void quoteSave(qedit)} disabled={!qlines.some((l) => l.pid)}
                  className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Save as new version</button>
                <button onClick={() => { setQedit(null); setQlines([{ pid: "", qty: "1" }]); }}
                  className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Cancel</button>
              </>
            )}
          </div>
        </div>
        {quotes.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {quotes.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span className="flex flex-wrap items-center gap-1.5">{q.no} v{q.version} · ₹{(q.grand / 100).toFixed(0)} · <StatusBadge status={q.status} />{q.acceptedOrderId ? ` → order #${q.acceptedOrderId}` : ""}</span>
                <span className="flex flex-wrap gap-1">
                  {quoteNext(q.status).map((to) => (
                    <button key={to} onClick={() => void quoteMove(q.id, to)}
                      className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">{to}</button>
                  ))}
                  {q.status === "approved" && (
                    <button onClick={() => void quoteAcceptGo(q.id)}
                      className="min-h-[44px] rounded-xl bg-brand px-3 text-xs font-semibold text-white">Accept → order</button>
                  )}
                  {q.status !== "accepted" && (
                    <button onClick={() => void quoteLoad(q.id)}
                      className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Revise</button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Coupons ({coupons.length})</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={ccode} onChange={(e) => setCcode(maskUpper(e.target.value))} placeholder="CODE" maxLength={24}
            className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-3 text-sm uppercase dark:border-white/20" />
          <select value={ckind} onChange={(e) => setCkind(e.target.value)}
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
            <option value="pct">%</option>
            <option value="flat">₹ flat</option>
          </select>
          <input value={cval} onChange={(e) => setCval(ckind === "pct" ? maskPercent(e.target.value) : maskAmount(e.target.value))} placeholder={ckind === "pct" ? "%" : "₹"} inputMode="decimal"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <IconBtn label="Save coupon" onClick={() => void addCoupon()} disabled={!ccode.trim() || !cval} tone="brand"><Plus size={20} /></IconBtn>
        </div>
        {coupons.length === 0 ? <div className="mt-2"><Empty>No coupons yet.</Empty></div> : (
          <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
            {coupons.map((c) => (
              <li key={c.code}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(c.code).then(
                      () => notifications.show({ title: "Copied", message: c.code, color: "teal" }),
                      () => notifications.show({ title: "Copy failed", message: "Long-press to copy manually.", color: "red" }),
                    );
                  }}
                  title={`Tap to copy ${c.code}`} aria-label={`Copy coupon ${c.code}`}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-full border border-black/15 px-3 py-1.5 dark:border-white/20">
                  {c.code} · {c.kind} {c.kind === "pct" ? `${c.value}%` : `₹${(c.value / 100).toFixed(0)}`} <Copy size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Add variant <span className="text-xs font-normal text-zinc-500">(measure only — no price, no picking: uses last added product)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <div className="min-w-[140px] flex-1 basis-full sm:basis-0"><ProductPicker value={vpid} shortcut="F4" onPick={(x) => setVpid(x ? String(x.id) : "")} placeholder="Product for variant…" /></div>
          <select value={vtype} onChange={(e) => setVtype(e.target.value)} aria-label="Measurement type"
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
            {MEASURE_TYPES.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input value={vval} onChange={(e) => setVval(e.target.value)} placeholder="Value (500)" maxLength={20}
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <select value={vunit} onChange={(e) => setVunit(e.target.value)} aria-label="Variant unit"
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
            {["pc", "kg", "g", "l", "ml", "m", "cm", "box", "dozen", "pack"].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-black/15 px-3 text-sm dark:border-white/20">
            <input type="checkbox" checked={variety} onChange={(e) => setVariety(e.target.checked)} className="h-5 w-5" />
            variety?
          </label>
          {variety && (
            <>
              <input value={vcolor} onChange={(e) => setVcolor(e.target.value)} placeholder="Color" maxLength={20}
                className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
              <input value={vsize} onChange={(e) => setVsize(e.target.value)} placeholder="Size" maxLength={20}
                className="min-h-[44px] w-20 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
            </>
          )}
          <input value={vname} onChange={(e) => setVname(e.target.value)} placeholder="Name (auto)" maxLength={120}
            className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <IconBtn label="Add variant" onClick={() => void addVariant()} disabled={!vpid} tone="brand"><Plus size={20} /></IconBtn>
        </div>
        <button onClick={() => setMatrix((m) => !m)} aria-expanded={matrix}
          className="mt-1.5 flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-brand-deep">
          {matrix ? "▾" : "▸"} Matrix: color × size in one go
        </button>
        {matrix && (
          <div className="mt-1.5 grid gap-1.5 rounded-xl border border-black/10 p-2 dark:border-white/10">
            <div className="flex flex-wrap gap-1.5">
              <input value={mcolors} onChange={(e) => setMcolors(e.target.value)} placeholder="Colors: Red, Blue" maxLength={200}
                className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
              <input value={msizes} onChange={(e) => setMsizes(e.target.value)} placeholder="Sizes: S, M, L" maxLength={200}
                className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
              <button onClick={() => void previewMatrix()} disabled={!vpid || combos.length === 0}
                className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20 disabled:opacity-40">
                Preview {combos.length > 0 ? `(${combos.length})` : ""}</button>
            </div>
            {combos.length > 0 && (
              <ul className="grid max-h-44 gap-0.5 overflow-y-auto overscroll-contain">
                {combos.map((k) => {
                  const key = comboKey(k.c, k.s);
                  const off = excluded.includes(key);
                  return (
                    <li key={key}>
                      <label className="flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg px-2 text-sm hover:bg-black/5 dark:hover:bg-white/10">
                        <input type="checkbox" checked={!off}
                          onChange={() => setExcluded((xs) => (off ? xs.filter((x) => x !== key) : [...xs, key]))}
                          className="h-5 w-5" />
                        <span className={off ? "text-zinc-400 line-through" : ""}>{key}</span>
                        <span className="ml-auto font-mono text-xs text-zinc-500">{skuFor(k.c, k.s)}{existing.includes(key) ? " · exists" : ""}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            <button onClick={() => void generateMatrix()} disabled={!vpid || generating || combos.filter((k) => !excluded.includes(comboKey(k.c, k.s))).length === 0}
              className="min-h-[48px] rounded-xl bg-brand text-sm font-bold text-white disabled:opacity-40">
              {generating ? "Generating…" : `Generate ${combos.filter((k) => !excluded.includes(comboKey(k.c, k.s))).length} variants`}</button>
          </div>
        )}
      </AdminCard>
      {msg && <p className="text-sm text-zinc-500">{msg}</p>}
    </div>
  );
}
