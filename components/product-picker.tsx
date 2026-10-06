"use client";

import { useEffect, useRef, useState } from "react";
import { useClickOutside } from "@/components/admin-ux";

interface Pick { id: number; name: string; price: number; stock: number; sku: string }

// Search by name / barcode / SKU with keyboard shortcut; picking fills the
// product id automatically. Reused everywhere an id was typed by hand.
export function ProductPicker({ value, onPick, shortcut, placeholder = "Search product…" }: {
  value: string; onPick: (p: Pick | null) => void; shortcut?: string; placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<Pick[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hi, setHi] = useState(-1);
  const wrapRef = useClickOutside<HTMLDivElement>(() => setOpen(false));
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
    setBusy(true);
    timer.current = setTimeout(async () => {
      const d = await fetch(`/api/shop/products?q=${encodeURIComponent(v.trim())}`).then((r) => r.json()).catch(() => null);
      const list = (d?.products ?? []).slice(0, 8);
      setOpts(list);
      setOpen(list.length > 0);
      setHi(-1);
      setBusy(false);
    }, 250);
  }

  return (
    <div ref={wrapRef} className="relative min-w-[140px] flex-1 basis-full sm:basis-0">
      <div className="flex gap-1.5">
        <input ref={boxRef} value={q} onChange={(e) => search(e.target.value)}
          role="combobox" aria-expanded={open} aria-controls="product-suggest" aria-autocomplete="list" aria-busy={busy}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setOpen(false); return; }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              if (!open) { if (opts.length > 0) { setOpen(true); setHi(0); } return; }
              setHi((h) => (e.key === "ArrowDown" ? (h + 1) % opts.length : (h - 1 + opts.length) % opts.length));
              return;
            }
            if (e.key === "Enter" && open && hi >= 0 && opts[hi]) {
              e.preventDefault();
              onPick(opts[hi]); setQ(opts[hi].name); setOpen(false); setHi(-1);
            }
          }}
          aria-activedescendant={hi >= 0 ? `product-opt-${opts[hi]?.id ?? hi}` : undefined}
          onFocus={() => { if (opts.length > 0) setOpen(true); }}
          type="search" enterKeyHint="search" autoComplete="off" placeholder={`${placeholder}${shortcut ? ` (${shortcut})` : ""}`} maxLength={60}
          className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <input value={value} readOnly aria-label="Selected product id" title="Auto-assigned product id"
          className="min-h-[44px] w-16 rounded-xl border border-dashed border-black/20 bg-transparent px-2 text-center font-mono text-sm dark:border-white/20" />
      </div>
      {open && (
        <ul id="product-suggest" role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-[50vh] overflow-y-auto overscroll-contain rounded-xl border border-black/15 bg-white shadow-xl dark:border-white/20 dark:bg-zinc-900">
          {opts.map((p, i) => (
            <li key={p.id} role="option" id={`product-opt-${p.id}`} aria-selected={i === hi}>
              <button
                onClick={() => { onPick(p); setQ(p.name); setOpen(false); }}
                onMouseEnter={() => setHi(i)}
                className={`flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${i === hi ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10"}`}>
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
