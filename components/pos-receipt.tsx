"use client";

import { EanBars } from "@/components/labels";

export interface ReceiptData {
  crn: string; barcode: string;
  order: { id: number; status: string; subtotal: number; discount: number; tax: number; grand: number; coupon: string; createdAt: string };
  lines: { productId: number; name: string; qty: number; price: number; total: number }[];
  payments: { method: string; amount: number; status: string }[];
  business: { name: string; address: string; city: string; state: string; pin: string; gstin: string; phone: string; email: string };
  meta?: { width?: string; logo?: string; composition?: boolean };
}

// Customer copy: business, CRN + tracking barcode, billable lines, money,
// payment remark. Print CSS emits this card only.
export function PosReceipt({ data, tendered, change, onNew }: {
  data: ReceiptData; tendered: number; change: number; onNew: () => void;
}) {
  const o = data.order;
  const b = data.business;
  const method = data.payments[0]?.method ?? "cash";
  const addr = [b.address, b.city, b.state, b.pin].filter(Boolean).join(", ");
  const width = data.meta?.width === "58" || data.meta?.width === "80" ? data.meta.width : "72";
  const logo = data.meta?.logo || "";
  return (
    <div id="pos-receipt" className="mx-auto max-w-sm rounded-2xl border border-black/10 bg-white p-4 text-sm text-black dark:border-white/10 dark:bg-white dark:text-black">
      <style>{`@media print {
        @page { size: ${width}mm auto; margin: 0; }
        body { background: #fff !important; }
        body * { visibility: hidden; }
        #pos-receipt, #pos-receipt * { visibility: visible; }
        #pos-receipt { position: absolute; inset: 0 auto auto 0; width: ${width}mm; border: none; border-radius: 0; margin: 0; }
        nav[aria-label="Admin"], .impersonate-bar { display: none !important; }
      }`}</style>
      <div className="text-center">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="mx-auto mb-1 h-10 w-auto" />
        ) : null}
        <p className="text-base font-extrabold">{b.name || "Counter Bill"}</p>
        {addr ? <p className="text-xs text-zinc-600">{addr}</p> : null}
        {(b.phone || b.email) && <p className="text-xs text-zinc-600">{[b.phone, b.email].filter(Boolean).join(" · ")}</p>}
        {b.gstin ? <p className="font-mono text-xs text-zinc-600">GSTIN {b.gstin}</p> : null}
        {data.meta?.composition ? <p className="text-xs font-bold text-zinc-600">Composition scheme — tax not collected</p> : null}
      </div>
      <hr className="my-2 border-dashed border-black/20" />
      <p className="flex justify-between font-mono text-xs"><span>{data.crn}</span><span>{o.createdAt.slice(0, 16).replace("T", " ")}</span></p>
      <ul className="mt-2 space-y-1">
        {data.lines.map((l, i) => (
          <li key={i} className="flex justify-between gap-2">
            <span className="min-w-0 flex-1 truncate">{l.name} × {l.qty}</span>
            <span className="shrink-0 font-mono">₹{(l.total / 100).toFixed(0)}</span>
          </li>
        ))}
      </ul>
      <hr className="my-2 border-dashed border-black/20" />
      <div className="space-y-0.5 font-mono text-xs">
        <p className="flex justify-between"><span>Subtotal</span><span>₹{(o.subtotal / 100).toFixed(0)}</span></p>
        {o.discount > 0 && <p className="flex justify-between"><span>Discount{o.coupon ? ` (${o.coupon})` : ""}</span><span>−₹{(o.discount / 100).toFixed(0)}</span></p>}
        {o.tax > 0 && <p className="flex justify-between"><span>Tax</span><span>₹{(o.tax / 100).toFixed(0)}</span></p>}
        <p className="flex justify-between text-base font-extrabold"><span>Total</span><span>₹{(o.grand / 100).toFixed(0)}</span></p>
        {data.payments.length > 1 ? (
          <div className="rounded bg-black/5 px-2 py-1 dark:bg-white/10">
            <p className="font-bold">Split tender</p>
            {data.payments.map((pm, i) => (
              <p key={i} className="flex justify-between"><span>{pm.method.toUpperCase()} · {pm.status}</span><span>₹{(pm.amount / 100).toFixed(0)}</span></p>
            ))}
          </div>
        ) : (
          <p className="flex justify-between"><span>Paid by {method.toUpperCase()}</span><span>{data.payments[0]?.status ?? "paid"}</span></p>
        )}
        {method === "cash" && tendered > 0 && (
          <>
            <p className="flex justify-between"><span>Tendered</span><span>₹{(tendered / 100).toFixed(0)}</span></p>
            <p className="flex justify-between font-bold"><span>Change</span><span>₹{(change / 100).toFixed(0)}</span></p>
          </>
        )}
      </div>
      <div className="mt-2 flex flex-col items-center gap-1">
        <EanBars code={data.barcode} height={44} />
        <p className="text-[11px] text-zinc-600">Keep this bill — scan for returns & tracking</p>
      </div>
      <div className="mt-3 flex gap-1.5 print:hidden">
        <button onClick={() => window.print()} className="min-h-[48px] flex-1 rounded-xl bg-black text-sm font-bold text-white">Print customer copy</button>
        <button onClick={onNew} className="min-h-[48px] flex-1 rounded-xl border border-black/20 text-sm font-bold">New sale</button>
      </div>
    </div>
  );
}
