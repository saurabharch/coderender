"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, BarChart3, Boxes, ClipboardList, Package, ScanBarcode, TrendingUp } from "lucide-react";
import { WasmScanDialog } from "@/components/wasm-scan-dialog";

const ICONS: Record<string, typeof Banknote> = {
  pos: Banknote, orders: ClipboardList, inventory: Package,
  stock: Boxes, sales: TrendingUp, bi: BarChart3,
};

interface Item { id: string; label: string; href: string }

// Staff floating bar (admin, phones only): role-based quick actions from
// /api/quickbar with the barcode scanner raised in the center. Scan resolves
// through catalog lookup straight to the product detail page.
export function StaffQuickBar() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/quickbar").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.items) setItems(d.items);
    }).catch(() => {});
  }, []);

  async function onScan(data: string) {
    setScanOpen(false);
    const d = await fetch(`/api/shop/scan?code=${encodeURIComponent(data)}`).then((r) => r.json()).catch(() => null);
    if (d?.ok && d.productId) {
      router.push(`/admin/shop/${d.productId}`);
    } else {
      setMsg(`No product for ${data.slice(0, 24)}`);
      setTimeout(() => setMsg(""), 3000);
    }
  }

  if (!items) return null;
  const left = items.slice(0, Math.ceil(items.length / 2));
  const right = items.slice(Math.ceil(items.length / 2));
  const cell = "flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold";

  return (
    <>
      <div className="fixed inset-x-0 bottom-3 z-40 px-4 pb-[env(safe-area-inset-bottom)] md:hidden">
        {msg ? <p role="status" className="mx-auto mb-1 w-fit rounded-full bg-black/80 px-3 py-1 text-xs text-white">{msg}</p> : null}
        <div className="glass mx-auto flex max-w-sm items-end rounded-3xl px-1 pb-1 pt-1">
          {left.map((it) => {
            const Icon = ICONS[it.id] ?? Package;
            return (
              <a key={it.id} href={it.href} aria-label={it.label} className={cell}>
                <Icon size={20} />{it.label}
              </a>
            );
          })}
          <button onClick={() => setScanOpen(true)} aria-label="Scan barcode"
            className="-mt-7 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-lg">
            <ScanBarcode size={26} />
          </button>
          {right.map((it) => {
            const Icon = ICONS[it.id] ?? Package;
            return (
              <a key={it.id} href={it.href} aria-label={it.label} className={cell}>
                <Icon size={20} />{it.label}
              </a>
            );
          })}
        </div>
      </div>
      <WasmScanDialog open={scanOpen} onClose={() => setScanOpen(false)} title="Scan product"
        onScan={(data) => { void onScan(data); }} />
    </>
  );
}
