import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductFull, listLots } from "@/lib/commerce";
import { PrintButton } from "@/components/print-button";
import { EanBars, QrImg } from "@/components/labels";
import { sessionUser } from "@/lib/auth";

const SIZES: Record<string, { label: string; w: number; h: number }> = {
  "50x25": { label: "50 × 25 mm", w: 189, h: 94 },
  "38x21": { label: "38 × 21 mm", w: 144, h: 79 },
  "70x35": { label: "70 × 35 mm", w: 265, h: 132 },
  "100x50": { label: "100 × 50 mm", w: 378, h: 189 },
};

// Label studio: both / QR-only / barcode-only, sticker sizes (preset + custom
// ?w=&h= in mm), product ID + name, batch mfg/exp (?lot=).
export default async function Labels({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ copies?: string; mode?: string; size?: string; w?: string; h?: string; lot?: string }>;
}) {
  const user = await sessionUser();
  if (!user) return notFound();
  const { id } = await params;
  const sp = await searchParams;
  const full = getProductFull(Number(id)) as {
    product: { id: number; name: string; price: number; barcode: string; barcodeType: string; sku: string };
  } | null;
  if (!full) return notFound();
  const copies = Math.min(24, Math.max(1, Number(sp.copies || 4) || 4));
  const mode = ["both", "qr", "barcode"].includes(sp.mode ?? "") ? sp.mode! : "both";
  const preset = SIZES[sp.size ?? ""];
  const W = preset ? preset.w : Math.min(600, Math.max(100, Math.round(Number(sp.w || 50) * 3.7795)));
  const H = preset ? preset.h : Math.min(400, Math.max(60, Math.round(Number(sp.h || 25) * 3.7795)));
  const lots = listLots(Number(id)) as { id: number; lot: string; mfg: string; exp: string }[];
  const lot = lots.find((l) => String(l.id) === sp.lot) ?? lots[0];
  const p = full.product;
  const link = (q: Record<string, string>) => {
    const u = new URLSearchParams({ copies: String(copies), mode, ...(preset ? { size: sp.size! } : {}), ...q });
    return `/admin/shop/${id}/labels?${u}`;
  };
  return (
    <div className="mx-auto max-w-3xl bg-white p-6 text-black print:p-0">
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <p className="font-bold">Labels × {copies}</p>
        {(["both", "qr", "barcode"] as const).map((m) => (
          <Link key={m} href={link({ mode: m })}
            className={`flex min-h-[44px] items-center rounded-xl border px-3 text-xs font-bold uppercase ${mode === m ? "border-black bg-black text-white" : ""}`}>{m}</Link>
        ))}
        {Object.entries(SIZES).map(([k, s]) => (
          <Link key={k} href={link({ size: k })}
            className={`flex min-h-[44px] items-center rounded-xl border px-3 text-xs ${preset && sp.size === k ? "border-black bg-black text-white" : ""}`}>{s.label}</Link>
        ))}
        {lots.length > 0 && (
          <form action={`/admin/shop/${id}/labels`} method="get" className="flex gap-1">
            <input type="hidden" name="copies" value={copies} />
            <input type="hidden" name="mode" value={mode} />
            {preset && <input type="hidden" name="size" value={sp.size} />}
            <select name="lot" defaultValue={lot?.id} className="min-h-[44px] rounded-xl border px-2 text-xs">
              {lots.map((l) => <option key={l.id} value={l.id}>{l.lot || `#${l.id}`} · exp {l.exp || "—"}</option>)}
            </select>
            <button className="min-h-[44px] rounded-xl border px-3 text-xs font-semibold">Batch</button>
          </form>
        )}
        <span className="flex gap-2"><PrintButton /><Link href="/admin/shop" className="flex min-h-[44px] items-center rounded-xl border px-4 text-sm font-semibold">Back</Link></span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: copies }).map((_, i) => (
          <div key={i} className="break-inside-avoid rounded-lg border border-black/25 p-2 text-center" style={{ width: W, minHeight: H }}>
            <p className="truncate text-[11px] font-bold">#{p.id} {p.name}</p>
            <p className="text-base font-extrabold">₹{(p.price / 100).toFixed(0)}</p>
            <div className="mt-1 flex items-center justify-center gap-2">
              {(mode === "both" || mode === "qr") && <QrImg text={p.barcode || String(p.sku || p.name)} size={Math.min(96, H - 20)} />}
              {(mode === "both" || mode === "barcode") && <EanBars code={p.barcode} height={Math.min(48, H - 30)} />}
            </div>
            <p className="mt-1 text-[9px] text-zinc-600">
              {[p.barcodeType || "code", lot?.lot && `B:${lot.lot}`, lot?.mfg && `M:${lot.mfg}`, lot?.exp && `E:${lot.exp}`].filter(Boolean).join(" · ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
