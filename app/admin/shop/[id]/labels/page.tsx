import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductFull, listLots } from "@/lib/commerce";
import { sessionUser } from "@/lib/auth";
import { BarcodeGenerator } from "@/components/barcode-generator";
import { LabelStudio, STICKER_PRESETS } from "@/components/label-studio";

// Label print studio: server loads product + lots (deep-planed for the client
// studio); paper/content settings live per-device, print CSS emits stickers only.
export default async function Labels({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ copies?: string; mode?: string; size?: string; lot?: string }>;
}) {
  const user = await sessionUser();
  if (!user) return notFound();
  const { id } = await params;
  const sp = await searchParams;
  const full = getProductFull(Number(id)) as {
    product: { id: number; name: string; price: number; mrp: number; barcode: string; sku: string };
  } | null;
  if (!full) return notFound();
  const p = full.product;
  const lots = JSON.parse(JSON.stringify(listLots(Number(id)))) as { id: number; lot: string; mfg: string; exp: string }[];
  const copies = Math.min(999, Math.max(1, Number(sp.copies || 24) || 24));
  const mode = (["both", "qr", "barcode"] as const).includes(sp.mode as never) ? (sp.mode as "both" | "qr" | "barcode") : "both";
  const preset = sp.size ? STICKER_PRESETS[sp.size] : undefined;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="print:hidden">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Inventory · labels</p>
        <h1 className="display-1 mt-1">#{p.id} {p.name}</h1>
        <div className="mb-3 mt-3"><BarcodeGenerator productId={Number(id)} /></div>
      </div>
      <LabelStudio
        product={JSON.parse(JSON.stringify({ id: p.id, name: p.name, price: p.price, mrp: p.mrp, barcode: p.barcode, sku: p.sku }))}
        lots={lots}
        initial={{ copies, lot: sp.lot ?? "", mode, stW: preset?.w, stH: preset?.h }}
      />
      <p className="mt-3 print:hidden"><Link href="/admin/shop" className="font-semibold text-brand-deep underline">← Inventory</Link></p>
    </div>
  );
}
