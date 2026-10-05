import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductFull } from "@/lib/commerce";
import { PrintButton } from "@/components/print-button";
import { EanBars, QrImg } from "@/components/labels";
import { sessionUser } from "@/lib/auth";

// Shelf label sheet: QR + EAN bars + price, one card per copy.
export default async function Labels({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ copies?: string }>;
}) {
  const user = await sessionUser();
  if (!user) return notFound();
  const { id } = await params;
  const sp = await searchParams;
  const full = getProductFull(Number(id)) as {
    product: { name: string; price: number; barcode: string; barcodeType: string; sku: string };
  } | null;
  if (!full) return notFound();
  const copies = Math.min(24, Math.max(1, Number(sp.copies || 4) || 4));
  const p = full.product;
  return (
    <div className="mx-auto max-w-3xl bg-white p-6 text-black print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <p className="font-bold">Labels × {copies} — change with <code>?copies=8</code></p>
        <span className="flex gap-2"><PrintButton /><Link href="/admin/shop" className="flex min-h-[44px] items-center rounded-xl border px-4 text-sm font-semibold">Back</Link></span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: copies }).map((_, i) => (
          <div key={i} className="break-inside-avoid rounded-xl border border-black/20 p-3 text-center">
            <p className="truncate text-sm font-bold">{p.name}</p>
            <p className="text-lg font-extrabold">₹{(p.price / 100).toFixed(0)}</p>
            <div className="mt-1 flex justify-center"><QrImg text={p.barcode || String(p.sku || p.name)} size={96} /></div>
            <div className="mt-1 flex justify-center"><EanBars code={p.barcode} height={44} /></div>
            <p className="mt-1 text-[10px] text-zinc-600">{p.barcodeType || "code"} · {p.sku}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
