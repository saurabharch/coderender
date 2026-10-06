"use client";

import { useEffect, useRef, useState } from "react";

interface Pick { id: number; name: string; price: number; stock: number; sku: string }

// Search by name / barcode / SKU with keyboard shortcut; picking fills the
// product id automatically. Reused everywhere an id was typed by hand.
export function ProductPicker({ value, onPick, shortcut, placeholder = "Search product…" }: {
  value: string; onPick: (p: Pick | null) => void; shortcut?: string; placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<Pick[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key.toUpperCase() === shortcut.toUpperCase()) {
        e.preventDefault();
        boxRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  function search(v: string) {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) { setOpts([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const d = await fetch(`/api/shop/products?q=${encodeURIComponent(v.trim())}`).then((r) => r.json()).catch(() => null);
      const list = (d?.products ?? []).slice(0, 8);
      setOpts(list);
      setOpen(list.length > 0);
    }, 250);
  }

  return (
    <div className="relative min-w-[140px] flex-1 basis-full sm:basis-0">
      <div className="flex gap-1.5">
        <input ref={boxRef} value={q} onChange={(e) => search(e.target.value)}
          type="search" enterKeyHint="search" autoComplete="off" placeholder={`${placeholder}${shortcut ? ` (${shortcut})` : ""}`} maxLength={60}
          className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <input value={value} readOnly aria-label="Selected product id" title="Auto-assigned product id"
          className="min-h-[44px] w-16 rounded-xl border border-dashed border-black/20 bg-transparent px-2 text-center font-mono text-sm dark:border-white/20" />
      </div>
      {open && (
        <ul className="absolute inset-x-0 top-full z-30 mt-1 max-h-[50vh] overflow-y-auto overscroll-contain rounded-xl border border-black/15 bg-white shadow-xl dark:border-white/20 dark:bg-zinc-900">
          {opts.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => { onPick(p); setQ(p.name); setOpen(false); }}
                className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10">
                <span className="min-w-0 truncate">#{p.id} {p.name}</span>
                <span className="shrink-0 text-xs text-zinc-500">₹{(p.price / 100).toFixed(0)} · {p.stock}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
