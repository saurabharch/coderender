"use client";

import { useEffect, useState } from "react";
import { AdminCard, Empty, Skeleton } from "@/components/admin-ui";
import { WasmScanDialog } from "@/components/wasm-scan-dialog";

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
  const [vpid, setVpid] = useState("");
  const [vname, setVname] = useState("");
  const [vsize, setVsize] = useState("");
  const [vcolor, setVcolor] = useState("");
  const [vprice, setVprice] = useState("");
  const [ccode, setCcode] = useState("");
  const [ckind, setCkind] = useState("pct");
  const [cval, setCval] = useState("");
  const [eid, setEid] = useState("");
  const [eprice, setEprice] = useState("");
  const [estock, setEstock] = useState("");
  const [slides, setSlides] = useState<{ id: number; title: string; anim: string; active: number }[]>([]);
  const [stitle, setStitle] = useState("");
  const [sanim, setSanim] = useState("slide");
  const [lots, setLots] = useState<{ id: number; lot: string; mfg: string; exp: string }[]>([]);
  const [lotpid, setLotpid] = useState("");
  const [lotno, setLotno] = useState("");
  const [lotmfg, setLotmfg] = useState("");
  const [lotexp, setLotexp] = useState("");
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
      body: JSON.stringify({ name, price: Math.round(Number(price) * 100), stock: Math.round(Number(stock) || 0), ...(barcode.trim() ? { barcode: barcode.trim() } : {}) }),
    });
    setMsg(res.ok ? "Product added ✓ (auto-barcode when left blank)" : "Add failed");
    if (res.ok) { setName(""); setPrice(""); setStock(""); setBarcode(""); void load(); }
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
    Object.assign(body, { name: cur.name });
    if (eprice) body.price = Math.round(Number(eprice) * 100);
    if (estock) body.stock = Math.round(Number(estock));
    const res = await fetch("/api/shop/products", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Updated ✓ (other fields kept)" : (d.error ?? "failed"));
    if (res.ok) { setEid(""); setEprice(""); setEstock(""); void load(); }
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

  async function loadLots() {
    if (!lotpid) { setLots([]); return; }
    const d = await fetch(`/api/shop/lots?productId=${encodeURIComponent(lotpid)}`).then((r) => r.json()).catch(() => null);
    if (d?.lots) setLots(d.lots);
  }

  async function loadPrices() {
    if (!pxpid) { setPrices([]); setChannels({}); return; }
    const [p, c] = await Promise.all([
      fetch(`/api/shop/pricing?what=prices&productId=${encodeURIComponent(pxpid)}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/shop/pricing?what=channels&productId=${encodeURIComponent(pxpid)}`).then((r) => r.json()).catch(() => null),
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

  async function addLot() {
    const res = await fetch("/api/shop/lots", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: Number(lotpid), lot: lotno, mfg: lotmfg, exp: lotexp }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Batch saved ✓" : (d.error ?? "failed"));
    if (res.ok) { setLotno(""); setLotmfg(""); setLotexp(""); void loadLots(); }
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
          <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Barcode (blank = auto)" maxLength={40}
            className="min-h-[44px] w-40 rounded-xl border border-black/15 bg-transparent px-3 font-mono text-sm dark:border-white/20" />
          <button onClick={() => setScanOpen(true)} aria-label="Scan barcode into this field" title="Scan into barcode field"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/15 text-lg dark:border-white/20">⌁</button>
          <WasmScanDialog open={scanOpen} onClose={() => setScanOpen(false)} title="Scan product barcode"
            onScan={(data) => { setBarcode(data.slice(0, 40)); setScanOpen(false); setMsg(`Scanned ${data} — edit or save the product`); }} />
          <button onClick={() => void addProduct()} disabled={!name.trim() || !price}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Add</button>
        </div>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Products ({products.length})</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={eid} onChange={(e) => setEid(e.target.value)} placeholder="Edit id" inputMode="numeric"
            className="min-h-[44px] w-20 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={eprice} onChange={(e) => setEprice(e.target.value)} placeholder="₹ new" inputMode="decimal"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={estock} onChange={(e) => setEstock(e.target.value)} placeholder="Stock" inputMode="numeric"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void quickEdit()} disabled={!eid}
            className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Update</button>
        </div>
        {products.length === 0 ? <div className="mt-2"><Empty>No products yet — add the first above.</Empty></div> : (
          <ul className="mt-2 space-y-1 text-sm">
            {products.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span className="min-w-0 truncate">#{p.id} {p.name} {p.sku && <span className="text-xs text-zinc-500">{p.sku}</span>}
                  {p.category && <span className="ml-1 rounded-full bg-black/5 px-2 py-0.5 text-[11px] dark:bg-white/10">{p.category}</span>}
                  {p.ratingCount > 0 && <span className="ml-1 text-xs text-amber-600">★{p.ratingAvg}({p.ratingCount})</span>}
                  {p.vcount > 0 && <span className="ml-1 text-xs text-zinc-500">{p.vcount} variants</span>}</span>
                <span className="flex shrink-0 items-center gap-1">₹{(p.price / 100).toFixed(0)} · {p.stock}
                  <a href={`/admin/shop/${p.id}/labels`} aria-label={`Print labels for ${p.name}`}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/15 text-xs dark:border-white/20">🏷</a>
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
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
              <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
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
          <input value={lotpid} onChange={(e) => { setLotpid(e.target.value); }} onBlur={() => void loadLots()} placeholder="Product id" inputMode="numeric"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={lotno} onChange={(e) => setLotno(e.target.value)} placeholder="Batch no" maxLength={40}
            className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={lotmfg} onChange={(e) => setLotmfg(e.target.value)} placeholder="MFG yyyy-mm" maxLength={10}
            className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={lotexp} onChange={(e) => setLotexp(e.target.value)} placeholder="EXP yyyy-mm" maxLength={10}
            className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void addLot()} disabled={!lotpid}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Save</button>
        </div>
        {lots.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {lots.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span>{l.lot || `#${l.id}`} · MFG {l.mfg || "—"} · EXP {l.exp || "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Prices & channels <span className="text-xs font-normal text-zinc-500">(tier overrides + where it sells)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={pxpid} onChange={(e) => setPxpid(e.target.value)} onBlur={() => void loadPrices()} placeholder="Product id" inputMode="numeric"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
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
          <input value={vpid} onChange={(e) => setVpid(e.target.value)} placeholder="Product id" inputMode="numeric"
            className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={vname} onChange={(e) => setVname(e.target.value)} placeholder="Variant name" maxLength={120}
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
