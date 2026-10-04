"use client";

import { useEffect, useState } from "react";
import { AdminCard, Empty, Skeleton } from "@/components/admin-ui";

interface Product { id: number; name: string; sku: string; price: number; stock: number; status: string }
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

  async function load() {
    const [p, o, c] = await Promise.all([
      fetch("/api/shop/products").then((r) => r.json()).catch(() => null),
      fetch("/api/shop/orders").then((r) => r.json()).catch(() => null),
      fetch("/api/shop/pricing").then((r) => r.json()).catch(() => null),
    ]);
    if (p?.products) setProducts(p.products);
    if (o?.orders) setOrders(o.orders);
    if (c?.coupons) setCoupons(c.coupons);
    setLoaded(true);
  }

  useEffect(() => { void load(); }, []);

  async function addProduct() {
    const res = await fetch("/api/shop/products", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price: Math.round(Number(price) * 100), stock: Math.round(Number(stock) || 0) }),
    });
    setMsg(res.ok ? "Product added ✓" : "Add failed");
    if (res.ok) { setName(""); setPrice(""); setStock(""); void load(); }
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
          <button onClick={() => void addProduct()} disabled={!name.trim() || !price}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Add</button>
        </div>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Products ({products.length})</p>
        {products.length === 0 ? <div className="mt-2"><Empty>No products yet — add the first above.</Empty></div> : (
          <ul className="mt-2 space-y-1 text-sm">
            {products.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span className="min-w-0 truncate">#{p.id} {p.name} {p.sku && <span className="text-xs text-zinc-500">{p.sku}</span>}</span>
                <span className="shrink-0">₹{(p.price / 100).toFixed(0)} · {p.stock} · {p.status}</span>
              </li>
            ))}
          </ul>
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
        {coupons.length === 0 ? <div className="mt-2"><Empty>No coupons — create via API or the next phase UI.</Empty></div> : (
          <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
            {coupons.map((c) => (
              <li key={c.code} className="rounded-full border border-black/15 px-3 py-1.5 dark:border-white/20">
                {c.code} · {c.kind} {c.kind === "pct" ? `${c.value}%` : `₹${(c.value / 100).toFixed(0)}`}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      {msg && <p className="text-sm text-zinc-500">{msg}</p>}
    </div>
  );
}
