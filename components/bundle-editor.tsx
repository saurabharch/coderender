"use client";

import { useEffect, useState } from "react";
import { ProductPicker } from "@/components/product-picker";
import { IconBtn } from "@/components/admin-ux";
import { Plus } from "lucide-react";

// Kit editor: components + qty per bundle product, one level only.
// Pricing stays on the bundle line; stock moves at the components.
export function BundleEditor({ bundleId }: { bundleId: number }) {
  const [comps, setComps] = useState<{ productId: number; qty: number; name: string }[]>([]);
  const [avail, setAvail] = useState<number | null>(null);
  const [pid, setPid] = useState("");
  const [qty, setQty] = useState("1");
  const [msg, setMsg] = useState("");

  async function load() {
    const d = await fetch(`/api/shop/bundle?productId=${bundleId}`).then((r) => r.json()).catch(() => null);
    if (d) {
      setComps(d.components ?? []);
      setAvail(typeof d.availability === "number" ? d.availability : null);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [bundleId]);

  async function add() {
    const res = await fetch("/api/shop/bundle", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bundleId, productId: Number(pid), qty: Number(qty) || 1 }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Component added ✓" : (d.error ?? "failed"));
    if (res.ok) { setPid(""); setQty("1"); void load(); }
  }

  async function del(productId: number) {
    await fetch(`/api/shop/bundle?bundle=${bundleId}&product=${productId}`, { method: "DELETE" }).catch(() => null);
    void load();
  }

  return (
    <div>
      <p className="text-xs text-zinc-500">
        {avail === null ? "No components — add products below to make this a kit." : `Makes ${avail} kit${avail === 1 ? "" : "s"} from current stock.`}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <div className="min-w-[140px] flex-1 basis-full sm:basis-0">
          <ProductPicker value={pid} placeholder="Component product…" onPick={(x) => setPid(x ? String(x.id) : "")} />
        </div>
        <input value={qty} onChange={(e) => setQty(e.target.value.replace(/[^0-9.]/g, "").slice(0, 8))} placeholder="Qty" inputMode="decimal"
          className="min-h-[44px] w-20 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <IconBtn label="Add component" onClick={() => void add()} disabled={!pid} tone="brand"><Plus size={20} /></IconBtn>
      </div>
      {comps.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {comps.map((c) => (
            <li key={c.productId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
              <span>#{c.productId} {c.name} × {c.qty}</span>
              <button onClick={() => void del(c.productId)} aria-label={`Remove ${c.name}`}
                className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">Remove</button>
            </li>
          ))}
        </ul>
      )}
      {msg ? <p className="mt-1 text-xs text-zinc-500">{msg}</p> : null}
    </div>
  );
}
