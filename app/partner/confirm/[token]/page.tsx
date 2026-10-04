import Link from "next/link";
import { confirmPayout } from "@/lib/partners";

export default async function ConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let done: number | null = null;
  try {
    const r = await confirmPayout(String(token).slice(0, 64));
    done = r.id;
  } catch {
    done = null;
  }
  return (
    <div className="wrap section max-w-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Partners</p>
      <h1 className="display-1 mt-1">Payout confirmation</h1>
      {done ? (
        <p className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm font-semibold">
          Payout #{done} confirmed received and settled. Thank you for growing with CodeRender! <Link href="/partner/me" className="underline">Back to dashboard →</Link>
        </p>
      ) : (
        <p className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm font-semibold">
          Nothing to confirm — the payout may already be settled or the link expired. <Link href="/partner/me" className="underline">Dashboard →</Link>
        </p>
      )}
    </div>
  );
}
