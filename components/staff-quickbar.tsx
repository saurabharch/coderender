"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, BarChart3, Bot, Boxes, ClipboardList, Package, ScanBarcode, TrendingUp, X } from "lucide-react";
import { modals } from "@mantine/modals";
import { WasmScanDialog } from "@/components/wasm-scan-dialog";
import { AvatarInitials } from "@/components/admin-ux";

const ICONS: Record<string, typeof Banknote> = {
  pos: Banknote, orders: ClipboardList, inventory: Package,
  stock: Boxes, sales: TrendingUp, bi: BarChart3, ai: Bot,
};

interface Item { id: string; label: string; href?: string; action?: string }
interface TrayLine { id: number; name: string; price: number }

const TRAY_KEY = "cr_scan_tray";

function readTray(): TrayLine[] {
  try {
    const raw = window.localStorage.getItem(TRAY_KEY);
    const list = raw ? (JSON.parse(raw) as TrayLine[]) : [];
    return Array.isArray(list) ? list.filter((l) => Number(l.id) > 0) : [];
  } catch { return []; }
}

// Staff floating bar (admin, phones only): role-based quick actions with the
// barcode scanner raised in the center. What a scan DOES depends on the role:
// counter roles stage items into a tray (→ open in POS), marketing/sales jump
// to the product page, HR resolves a staff identity card.
export function StaffQuickBar() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [mode, setMode] = useState("tray");
  const [scanOpen, setScanOpen] = useState(false);
  const [tray, setTray] = useState<TrayLine[]>([]);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  const load = useCallback(() => {
    fetch("/api/quickbar").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.items) {
        setItems(d.items);
        if (d.scanMode) setMode(d.scanMode);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    setTray(readTray());
    // Settings saves in another tab must reflect without a reload.
    const onFocus = () => { load(); setTray(readTray()); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [load]);

  function say(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(""), 3000);
  }

  function stage(line: TrayLine) {
    const next = [...readTray(), line].slice(-50);
    try { window.localStorage.setItem(TRAY_KEY, JSON.stringify(next)); } catch { /* full */ }
    setTray(next);
    say(`${line.name.slice(0, 24)} → tray (${next.length})`);
  }

  async function onScan(data: string) {
    setScanOpen(false);
    const code = data.trim();
    if (!code) return;
    if (mode === "hr") {
      const digits = code.replace(/\D/g, "").slice(-8);
      const d = await fetch(`/api/people/employees?id=${encodeURIComponent(digits)}`).then((r) => r.json()).catch(() => null);
      const emp = d?.employee;
      if (!emp) { say(`No staff for ${code.slice(0, 24)}`); return; }
      const today = new Date().toISOString().slice(0, 10);
      modals.open({
        title: "Staff identity",
        children: (
          <div className="grid gap-2">
            <p className="flex items-center gap-2 font-bold"><AvatarInitials name={emp.name} />{emp.name}</p>
            <p className="text-sm text-zinc-500">#{emp.id} · {emp.designation || "—"} · {emp.dept || "—"}</p>
            <p className="text-sm">Today ({today}): <b>{d.today ?? "not marked"}</b></p>
            <a href="/admin/people" className="font-semibold text-brand-deep underline">Open in People →</a>
          </div>
        ),
      });
      return;
    }
    const d = await fetch(`/api/shop/scan?code=${encodeURIComponent(code)}`).then((r) => r.json()).catch(() => null);
    if (!d?.ok || !d.productId) { say(`No product for ${code.slice(0, 24)}`); return; }
    if (mode === "detail") {
      router.push(`/admin/shop/${d.productId}`);
      return;
    }
    stage({ id: d.productId, name: d.name, price: d.price });
  }

  if (!items) return null;
  const left = items.slice(0, Math.ceil(items.length / 2));
  const right = items.slice(Math.ceil(items.length / 2));
  const cell = "flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold";
  const renderItem = (it: Item) => {
    const Icon = ICONS[it.id] ?? Package;
    const inner = (<><Icon size={20} />{it.label}</>);
    return it.action ? (
      <button key={it.id} onClick={() => window.dispatchEvent(new Event(it.action!))} aria-label={it.label} className={cell}>
        {inner}
      </button>
    ) : (
      <a key={it.id} href={it.href} aria-label={it.label} className={cell}>
        {inner}
      </a>
    );
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-3 z-40 px-4 pb-[env(safe-area-inset-bottom)] md:hidden">
        {msg ? <p role="status" className="mx-auto mb-1 w-fit rounded-full bg-black/80 px-3 py-1 text-xs text-white">{msg}</p> : null}
        {tray.length > 0 && (
          <div className="mx-auto mb-1 flex w-fit max-w-full items-center gap-2 rounded-full bg-brand px-2 py-1 text-xs font-bold text-white">
            <span className="pl-2">{tray.length} in tray · ₹{(tray.reduce((s, l) => s + l.price, 0) / 100).toFixed(0)}</span>
            <button onClick={() => router.push("/admin/pos")} className="min-h-[44px] rounded-full bg-white/20 px-4">Open in POS →</button>
            <button onClick={() => { try { window.localStorage.removeItem(TRAY_KEY); } catch { /* ignore */ } setTray([]); }}
              aria-label="Clear tray" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/20"><X size={16} /></button>
          </div>
        )}
        <div className="glass mx-auto flex max-w-sm items-end rounded-3xl px-1 pb-1 pt-1">
          {left.map(renderItem)}
          <button onClick={() => setScanOpen(true)} aria-label="Scan barcode"
            className="-mt-7 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-lg">
            <ScanBarcode size={26} />
          </button>
          {right.map(renderItem)}
        </div>
      </div>
      <WasmScanDialog open={scanOpen} onClose={() => setScanOpen(false)} title="Scan"
        onScan={(data) => { void onScan(data); }} />
    </>
  );
}
