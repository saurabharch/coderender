import Link from "next/link";
import { notFound } from "next/navigation";
import { getBill } from "@/lib/billing";
import { getPref } from "@/lib/store";
import { PrintButton } from "@/components/print-button";
import { sessionUser } from "@/lib/auth";

export default async function BillPrint({ params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return notFound();
  const { id } = await params;
  const b = getBill(Number(id)) as
    { no: string; type: string; grand: number; subtotal: number; discount: number; tax: number;
      status: string; createdAt: string; customer: string; phone: string; lines: string } | null;
  if (!b) return notFound();
  const lines = JSON.parse(b.lines || "[]") as { label: string; qty: number; price: number }[];
  const biz = (k: string, fb: string) => getPref(k, "") || fb;
  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-black print:p-0">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-extrabold">{biz("biz_name", "CodeRender")}</p>
          <p className="text-sm text-zinc-600">
            {[biz("biz_address", ""), biz("biz_city", ""), biz("biz_state", ""), biz("biz_pin", "")].filter(Boolean).join(", ") || `${biz("biz_email", "hello@coderender.in")} · ${biz("biz_phone", "+919831778894")}`}
          </p>
          {(getPref("biz_gstin", "") || getPref("biz_cin", "")) && (
            <p className="text-xs text-zinc-500">
              {[getPref("biz_gstin", "") && `GSTIN ${getPref("biz_gstin", "")}`, getPref("biz_cin", "") && `CIN ${getPref("biz_cin", "")}`].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xl font-bold uppercase">{b.type}</p>
          <p className="font-mono">{b.no}</p>
          <p className="text-sm">{b.createdAt.slice(0, 10)} · {b.status}</p>
        </div>
      </div>
      {b.customer && <p className="mt-4 text-sm">Bill to: <b>{b.customer}</b>{b.phone ? ` · ${b.phone}` : ""}</p>}
      <table className="mt-4 w-full text-sm">
        <thead><tr className="border-b text-left"><th className="py-1">Item</th><th>Qty</th><th className="text-right">Amount</th></tr></thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-b"><td className="py-1">{l.label}</td><td>{l.qty}</td>
              <td className="text-right">₹{(l.qty * l.price / 100).toFixed(0)}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 space-y-1 text-right text-sm">
        <p>Subtotal ₹{(b.subtotal / 100).toFixed(0)}</p>
        {b.discount > 0 && <p>Discount −₹{(b.discount / 100).toFixed(0)}</p>}
        {b.tax > 0 && <p>Tax ₹{(b.tax / 100).toFixed(0)}</p>}
        <p className="text-lg font-extrabold">Total ₹{(b.grand / 100).toFixed(0)}</p>
      </div>
      <div className="mt-6 flex gap-2 print:hidden">
        <PrintButton />
        <Link href="/admin/billing" className="flex min-h-[44px] items-center rounded-xl border px-4 text-sm font-semibold">Back</Link>
      </div>
    </div>
  );
}
