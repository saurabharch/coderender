import Link from "next/link";
import { notFound } from "next/navigation";
import { getJob } from "@/lib/serviceops";
import { PrintButton } from "@/components/print-button";
import { sessionUser } from "@/lib/auth";

export default async function JobPrint({ params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUser();
  if (!user) return notFound();
  const { id } = await params;
  const j = getJob(Number(id)) as
    { no: string; service: string; staff: string; slot: string; status: string;
      notes: string; customer: string; phone: string; branch: string; createdAt: string } | null;
  if (!j) return notFound();
  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-black print:p-0">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-extrabold">CodeRender</p>
          <p className="text-sm text-zinc-600">{j.branch} branch</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">JOB CARD</p>
          <p className="font-mono">{j.no}</p>
          <p className="text-sm">{j.status}</p>
        </div>
      </div>
      <dl className="mt-4 space-y-1 text-sm">
        <div className="flex gap-2"><dt className="w-24 text-zinc-600">Service</dt><dd className="font-semibold">{j.service}</dd></div>
        <div className="flex gap-2"><dt className="w-24 text-zinc-600">Customer</dt><dd>{j.customer || "walk-in"}{j.phone ? ` · ${j.phone}` : ""}</dd></div>
        <div className="flex gap-2"><dt className="w-24 text-zinc-600">Staff</dt><dd>{j.staff || "unassigned"}</dd></div>
        <div className="flex gap-2"><dt className="w-24 text-zinc-600">Slot</dt><dd>{j.slot || "—"}</dd></div>
        {j.notes && <div className="flex gap-2"><dt className="w-24 text-zinc-600">Notes</dt><dd>{j.notes}</dd></div>}
      </dl>
      <div className="mt-6 flex gap-2 print:hidden">
        <PrintButton />
        <Link href="/admin/services" className="flex min-h-[44px] items-center rounded-xl border px-4 text-sm font-semibold">Back</Link>
      </div>
    </div>
  );
}
