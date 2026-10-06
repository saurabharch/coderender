"use client";

import { useEffect, useRef, useState } from "react";
import { DatePickerInput } from "@mantine/dates";
import { AdminCard, Empty, Skeleton } from "@/components/admin-ui";
import { NoSsr } from "@/components/no-ssr";
import { WasmScanDialog } from "@/components/wasm-scan-dialog";
import { ProductPicker } from "@/components/product-picker";

interface Product { id: number; name: string; sku: string; price: number; stock: number; status: string; category: string; ratingAvg: number; ratingCount: number; vcount: number }
interface Order { id: number; status: string; grand: number; coupon: string; createdAt: string }
interface Coupon { code: string; kind: string; value: number; active: number }

export function ShopConsole() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [barcode, setBarcode] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [imgurls, setImgurls] = useState("");
  const [pending, setPending] = useState<{ file: File; url: string } | null>(null);
  const addPhotoRef = useRef<HTMLInputElement>(null);
  const [vpid, setVpid] = useState("");
  const [vname, setVname] = useState("");
  const [vsize, setVsize] = useState("");
  const [vcolor, setVcolor] = useState("");
  const [vprice, setVprice] = useState("");
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
  const [lots, setLots] = useState<{ id: number; lot: string; mfg: string; exp: string }[]>([]);
  const [lotpid, setLotpid] = useState("");
  const [lotno, setLotno] = useState("");
  const [lotmfg, setLotmfg] = useState<Date | null>(null);
  const [lotexp, setLotexp] = useState<Date | null>(null);
  const [lotq, setLotq] = useState("");
  const [lotscan, setLotscan] = useState(false);
  const [lotfound, setLotfound] = useState<{ id: number; lot: string; mfg: string; exp: string; pname: string; pid: number; barcode: string; images: string; stock: number; sold: number }[]>([]);
  const [pxpid, setPxpid] = useState("");
  const [pxtype, setPxtype] = useState("sale");
  const [pxamt, setPxamt] = useState("");
  const [prices, setPrices] = useState<{ id: number; priceType: string; amount: number }[]>([]);
  const [channels, setChannels] = useState<Record<string, { enabled: boolean }>>({});

  async function load() {
    const [p, o, c, h] = await Promise.all([
      fetch("/api/shop/products").then((r) => r.json()).catch(() => null),
      fetch("/api/shop/orders").then((r) => r.json()).catch(() => null),
      fetch("/api/shop/pricing").then((r) => r.json()).catch(() => null),
      fetch("/api/finance?view=hero").then((r) => r.json()).catch(() => null),
    ]);
    if (p?.products) setProducts(p.products);
    if (o?.orders) setOrders(o.orders);
    if (c?.coupons) setCoupons(c.coupons);
    if (h?.slides) setSlides(h.slides);
    setLoaded(true);
  }

  useEffect(() => { void load(); }, []);

  async function addProduct() {
    const res = await fetch("/api/shop/products", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price: Math.round(Number(price) * 100), stock: Math.round(Number(stock) || 0), ...(barcode.trim() ? { barcode: barcode.trim() } : {}),
      ...(imgurls.trim() ? { images: imgurls.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10) } : {}) }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg("Add failed"); return; }
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
          if (q?.ok) void runClientWorker(u.url, q.id);
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
    setName(""); setPrice(""); setStock(""); setBarcode(""); setImgurls(""); void load();
  }

  async function addVariant() {
    const res = await fetch("/api/shop/products", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: Number(vpid), name: vname,
        attrs: { ...(vsize ? { size: vsize } : {}), ...(vcolor ? { color: vcolor } : {}) },
        price: Math.round(Number(vprice) * 100),
      }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Variant added ✓" : (d.error ?? "failed"));
    if (res.ok) { setVpid(""); setVname(""); setVsize(""); setVcolor(""); setVprice(""); }
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
      const worker = new Worker(new URL("./bg.worker.ts", import.meta.url));
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

  async function capturePhoto(productId: number, file: File | undefined) {    if (!file) return;
    setMsg("Uploading original…");
    try {
      // Downscale monster camera files first (upload cap is 2MB).
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      let blob: Blob = file;
      if (scale < 1) {
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bmp.width * scale);
        canvas.height = Math.round(bmp.height * scale);
        canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
        blob = await new Promise<Blob>((res, rej) =>
          canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.85)) ?? blob;
      }
      bmp.close();
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
      setMsg("Photo failed — try again or use an image URL.");
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
      body: JSON.stringify({ productId: Number(lotpid), lot: lotno, mfg: day(lotmfg), exp: day(lotexp) }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Batch saved ✓" : (d.error ?? "failed"));
    if (res.ok) { setLotno(""); setLotmfg(null); setLotexp(null); void loadLots(); }
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
        <p className="font-bold">Add product <span className="text-xs font-normal text-zinc-500">(₹ price, stock count)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={150}
            className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="₹" inputMode="decimal"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Stock" inputMode="numeric"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input ref={addPhotoRef} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Capture product photo"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPending({ file: f, url: URL.createObjectURL(f) });
              e.target.value = "";
            }} />
          <button onClick={() => addPhotoRef.current?.click()} aria-label="Capture product photo" title="Capture photo"
            className="flex min-h-[44px] min-w-[52px] items-center justify-center rounded-xl border border-black/15 text-lg dark:border-white/20">📷</button>
          <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Barcode (blank = auto)" maxLength={40}
            className="min-h-[44px] w-40 rounded-xl border border-black/15 bg-transparent px-3 font-mono text-sm dark:border-white/20" />
          <button onClick={() => setScanOpen(true)} aria-label="Scan barcode into this field" title="Scan into barcode field"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/15 text-lg dark:border-white/20">⌁</button>
          <WasmScanDialog open={scanOpen} onClose={() => setScanOpen(false)} title="Scan product barcode"
            onScan={(data) => { setBarcode(data.slice(0, 40)); setScanOpen(false); setMsg(`Scanned ${data} — edit or save the product`); }} />
          <button onClick={() => void addProduct()} disabled={!name.trim() || !price}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Add</button>
        </div>
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
          <div className="min-w-0 flex-1"><ProductPicker value={eid} shortcut="F7" placeholder="Product to edit…" onPick={(x) => setEid(x ? String(x.id) : "")} /></div>
          <input value={ename} onChange={(e) => setEname(e.target.value)} placeholder="Name (blank = keep)" maxLength={150}
            className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={eprice} onChange={(e) => setEprice(e.target.value)} placeholder="₹ new" inputMode="decimal"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={estock} onChange={(e) => setEstock(e.target.value)} placeholder="Stock" inputMode="numeric"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void quickEdit()} disabled={!eid}
            className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Update</button>
        </div>
        {products.length === 0 ? <div className="mt-2"><Empty>No products yet — add the first above.</Empty></div> : (
          <ul className="mt-2 space-y-2 text-sm">
            {products.map((p) => (
              <li key={p.id} className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <p className="min-w-0 truncate font-bold">#{p.id} {p.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">
                  {p.sku && <span className="font-mono">{p.sku}</span>}
                  {p.category && <span className="rounded-full bg-black/5 px-2 py-0.5 dark:bg-white/10">{p.category}</span>}
                  {p.ratingCount > 0 && <span className="text-amber-600">★{p.ratingAvg}({p.ratingCount})</span>}
                  {p.vcount > 0 && <span>{p.vcount} variants</span>}
                  <span className="ml-auto text-sm font-extrabold text-zinc-800 dark:text-zinc-100">₹{(p.price / 100).toFixed(0)} · {p.stock} in stock</span>
                </p>
                <p className="mt-1.5 flex gap-1.5">
                  <a href={`/admin/shop/${p.id}/labels`} aria-label={`Print labels for ${p.name}`}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-xl border border-black/15 text-xs font-semibold dark:border-white/20">🏷 Labels</a>
                  <button onClick={() => snap(p.id)} aria-label={`Photograph ${p.name}`}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-xl border border-black/15 text-xs font-semibold dark:border-white/20">📷 Photo</button>
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
        <p className="font-bold">Hero slider ({slides.length}) <span className="text-xs font-normal text-zinc-500">(shop theme front)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={stitle} onChange={(e) => setStitle(e.target.value)} placeholder="Title" maxLength={120}
            className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <select value={sanim} onChange={(e) => setSanim(e.target.value)}
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
            <option value="slide">slide</option>
            <option value="fade">fade</option>
            <option value="zoom">zoom</option>
          </select>
          <button onClick={() => void addSlide()} disabled={!stitle.trim()}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Add</button>
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
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Batches — mfg / expiry per product</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={lotq} onChange={(e) => setLotq(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void searchLot(); }}
            placeholder="Search batch id…" maxLength={40}
            className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 font-mono text-sm dark:border-white/20" />
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
          <div className="min-w-0 flex-1"><ProductPicker value={lotpid} shortcut="F6" placeholder="Product for batch… (or scan →)"
            onPick={(x) => { setLotpid(x ? String(x.id) : ""); if (x) void loadLots(String(x.id)); }} /></div>
          <button onClick={() => setLotscan(true)} aria-label="Scan product barcode"
            className="min-h-[48px] min-w-[52px] rounded-xl bg-black text-lg font-bold text-white dark:bg-white dark:text-black">⌁</button>
          <WasmScanDialog open={lotscan} onClose={() => setLotscan(false)} title="Scan product for batch"
            onScan={(data) => { void scanLot(data); }} />
          <input value={lotno} onChange={(e) => setLotno(e.target.value)} placeholder="Batch no" maxLength={40}
            className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <NoSsr fallback={<p className="text-sm text-zinc-500">Loading date pickers…</p>}>
          <DatePickerInput value={lotmfg} onChange={(v) => setLotmfg(Array.isArray(v) ? (v[0] as Date ?? null) : (v as Date | null))} label="MFG" valueFormat="YYYY-MM"
            className="w-32" styles={{ input: { minHeight: 44, borderRadius: 12 } }} />
          <DatePickerInput value={lotexp} onChange={(v) => setLotexp(Array.isArray(v) ? (v[0] as Date ?? null) : (v as Date | null))} label="EXP" valueFormat="YYYY-MM"
            className="w-32" styles={{ input: { minHeight: 44, borderRadius: 12 } }} />
          </NoSsr>
          <button onClick={() => void addLot()} disabled={!lotpid}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Save</button>
        </div>
        {lots.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {lots.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span>{l.lot || `#${l.id}`} · MFG {l.mfg || "—"} · EXP {l.exp || "—"}</span>
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
          <input value={pxamt} onChange={(e) => setPxamt(e.target.value)} placeholder="₹" inputMode="decimal"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void addPrice()} disabled={!pxpid || !pxamt}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Save</button>
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
                <span>#{o.id} · ₹{(o.grand / 100).toFixed(0)} · {o.status}{o.coupon ? ` · ${o.coupon}` : ""}</span>
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
        <p className="font-bold">Coupons ({coupons.length})</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={ccode} onChange={(e) => setCcode(e.target.value)} placeholder="CODE" maxLength={24}
            className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-3 text-sm uppercase dark:border-white/20" />
          <select value={ckind} onChange={(e) => setCkind(e.target.value)}
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
            <option value="pct">%</option>
            <option value="flat">₹ flat</option>
          </select>
          <input value={cval} onChange={(e) => setCval(e.target.value)} placeholder={ckind === "pct" ? "%" : "₹"} inputMode="decimal"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void addCoupon()} disabled={!ccode.trim() || !cval}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Save</button>
        </div>
        {coupons.length === 0 ? <div className="mt-2"><Empty>No coupons yet.</Empty></div> : (
          <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
            {coupons.map((c) => (
              <li key={c.code} className="rounded-full border border-black/15 px-3 py-1.5 dark:border-white/20">
                {c.code} · {c.kind} {c.kind === "pct" ? `${c.value}%` : `₹${(c.value / 100).toFixed(0)}`}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Add variant <span className="text-xs font-normal text-zinc-500">(size / color + own price)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <ProductPicker value={vpid} shortcut="F4" onPick={(x) => setVpid(x ? String(x.id) : "")} placeholder="Product for variant…" />          <input value={vname} onChange={(e) => setVname(e.target.value)} placeholder="Variant name" maxLength={120}
            className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={vsize} onChange={(e) => setVsize(e.target.value)} placeholder="Size" maxLength={20}
            className="min-h-[44px] w-20 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={vcolor} onChange={(e) => setVcolor(e.target.value)} placeholder="Color" maxLength={20}
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={vprice} onChange={(e) => setVprice(e.target.value)} placeholder="₹" inputMode="decimal"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void addVariant()} disabled={!vpid || !vprice}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Add</button>
        </div>
      </AdminCard>
      {msg && <p className="text-sm text-zinc-500">{msg}</p>}
    </div>
  );
}
