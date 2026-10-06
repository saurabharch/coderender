"use client";

import { useEffect, useState } from "react";
import { Phone } from "lucide-react";

interface Product { id: number; name: string; price: number; stock: number }

export default function CheckoutPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [method, setMethod] = useState("cod");
  const [done, setDone] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/shop/products").then((r) => r.json()).then((d) => {
      if (d?.products) setProducts(d.products.filter((p: Product) => p.stock > 0).slice(0, 30));
    }).catch(() => {});
  }, []);

  async function place() {
    setErr("");
    const lines = Object.entries(qty).filter(([, q]) => q > 0).map(([productId, q]) => ({ productId: Number(productId), qty: q }));
    if (!lines.length || !name.trim() || !phone.trim()) { setErr("Add items + your name and phone."); return; }
    const res = await fetch("/api/shop/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, address, lines, method }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) setDone(d.message);
    else setErr(d.error ?? "checkout failed");
  }

  if (done) {
    return (
      <div className="wrap section max-w-xl text-center">
        <p className="text-5xl">✓</p>
        <h1 className="display-1 mt-2">Order placed</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{done}</p>
      </div>
    );
  }
  return (
    <div className="wrap section max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Checkout</p>
      <h1 className="display-1 mt-1">Your cart</h1>
      <ul className="mt-4 space-y-2">
        {products.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-black/10 px-3 py-2 dark:border-white/10">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name} · ₹{(p.price / 100).toFixed(0)}</span>
            <span className="flex shrink-0 items-center gap-1">
              <button aria-label={`Less ${p.name}`} onClick={() => setQty((q) => ({ ...q, [p.id]: Math.max(0, (q[p.id] ?? 0) - 1) }))}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/15 text-lg dark:border-white/20">−</button>
              <b className="w-6 text-center">{qty[p.id] ?? 0}</b>
              <button aria-label={`More ${p.name}`} onClick={() => setQty((q) => ({ ...q, [p.id]: (q[p.id] ?? 0) + 1 }))}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/15 text-lg dark:border-white/20">+</button>
            </span>
          </li>
        ))}
        {products.length === 0 && <li className="text-sm text-zinc-500">Nothing in stock right now.</li>}
      </ul>
      <div className="mt-4 grid gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={120}
          className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (10 digits)" inputMode="tel" maxLength={20}
          className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address (optional)" maxLength={300}
          className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <div className="flex gap-2 text-sm">
          {(["cod", "upi"] as const).map((m) => (
            <label key={m} className="flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-black/15 px-3 font-semibold uppercase dark:border-white/20">
              <input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} className="h-5 w-5" />{m}
            </label>
          ))}
        </div>
        <button onClick={() => void place()} className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white">Place order</button>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
      <p className="mt-3 text-center text-sm text-zinc-500">
        <Phone size={14} className="mr-1 inline" /> Prefer talking? Order on WhatsApp instead.
      </p>
    </div>
  );
}
