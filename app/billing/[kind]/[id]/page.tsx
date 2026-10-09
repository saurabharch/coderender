import { notFound } from "next/navigation";
import { invoiceForOrder, receiptForPayment, transcriptForPayout } from "@/lib/finance";
import { sessionUser } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { PrintButton } from "@/components/print-button";

// Printable billing documents (team-only; client PII inside).

function PdfDownloads({ kind, id }: { kind: string; id: string }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      {(["modern", "minimal"] as const).map((theme) => (
        <a key={theme} href={`/api/billing/${kind}/${id}/pdf?theme=${theme}`}
          className="flex min-h-[44px] items-center rounded-xl border border-black/15 px-4 text-sm font-semibold capitalize dark:border-white/20">
          PDF · {theme}
        </a>
      ))}
    </span>
  );
}
export default async function BillingDoc({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const user = await sessionUser();
  if (!user) notFound();
  const { kind, id } = await params;
  const doc = kind === "invoice" ? invoiceForOrder(Number(id))
    : kind === "receipt" ? receiptForPayment(Number(id))
    : kind === "payout" ? transcriptForPayout(Number(id)) : null;
  if (!doc) notFound();
  return (
    <div className="wrap section max-w-2xl">
      <div className="rounded-2xl border border-black/10 p-6 dark:border-white/10">
        <div className="flex items-center justify-between">
          <Logo size={30} />
          <div className="text-right">
            <p className="font-extrabold">{doc.kind}</p>
            <p className="font-mono text-xs text-zinc-500">{doc.no} · {doc.date}</p>
          </div>
        </div>
        <p className="mt-4 text-sm"><b>Bill to:</b> {doc.billTo}</p>
        <table className="mt-3 w-full text-left text-sm">
          <thead><tr className="border-b border-black/10 dark:border-white/10"><th className="py-2">Item</th><th className="py-2 text-right">Amount</th></tr></thead>
          <tbody>
            {doc.lines.map((l, i) => (
              <tr key={i} className="border-b border-black/5 dark:border-white/5">
                <td className="py-2">{l.label}</td>
                <td className="py-2 text-right">₹{l.amount.toLocaleString("en-IN")}</td>
              </tr>
            ))}
            <tr><td className="py-2 font-extrabold">Total</td><td className="py-2 text-right font-extrabold">₹{doc.total.toLocaleString("en-IN")}</td></tr>
          </tbody>
        </table>
        <p className="mt-3 text-sm"><b>Status:</b> {doc.status}</p>
        <p className="mt-1 font-mono text-xs text-zinc-500">{doc.memo}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 print:hidden">
          <PrintButton />
          <PdfDownloads kind={kind} id={id} />
        </div>
      </div>
    </div>
  );
}
