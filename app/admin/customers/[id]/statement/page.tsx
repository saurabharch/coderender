import { PrintButton } from "@/components/print-button";
import { getPref } from "@/lib/store";
import { listPlans, udhariStatement } from "@/lib/commerce";
import { ageStatus } from "@/lib/credit-core";

// Printable customer dues statement (A4). Read-only over statement data:
// business header, dues + terms/overdue status, credit orders, timeline.
// Share = Print / PDF through the browser dialog (no PDF engine on-device).
async function PlansBlock({ customerId }: { customerId: number }) {
  let plans: { id: number; status: string }[] = [];
  try {
    plans = listPlans(customerId) as { id: number; status: string }[];
  } catch { plans = []; }
  if (!plans.length) return null;
  const { getPlan } = await import("@/lib/commerce");
  return (
    <div className="mt-4">
      <p className="mb-1 font-bold">Installment plans ({plans.length})</p>
      {plans.slice(0, 5).map((pl) => {
        const full = getPlan(pl.id) as { slices: { idx: number; dueAt: string; amount: number; paid: number }[] } | null;
        const slices = full?.slices ?? [];
        return (
          <div key={pl.id} className="mb-1 rounded-xl border border-black/10 p-2 dark:border-white/10">
            <p className="text-xs font-bold">Plan #{pl.id} · {pl.status}</p>
            <ul className="mt-1 space-y-0.5 font-mono text-xs">
              {slices.map((s) => (
                <li key={s.idx} className="flex justify-between gap-2">
                  <span>#{s.idx} · {s.dueAt}</span>
                  <span>₹{(s.paid / 100).toFixed(0)}/₹{(s.amount / 100).toFixed(0)}{s.paid >= s.amount ? " ✓" : ""}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export default async function StatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cid = Number(id) || 0;
  let data: Awaited<ReturnType<typeof udhariStatement>> | null = null;
  try {
    data = await udhariStatement(cid);
  } catch {
    data = null;
  }
  if (!data) {
    return (
      <div className="wrap section max-w-2xl">
        <h1 className="text-2xl font-extrabold">No statement</h1>
        <p className="mt-2 text-sm text-zinc-500">Unknown customer.</p>
      </div>
    );
  }
  const biz = (k: string) => {
    try { return getPref(k, ""); } catch { return ""; }
  };
  const c = data.customer as { name: string; phone: string; balance: number; credit: number; termsDays: number; balanceSince: string };
  const st = ageStatus({ balance: c.balance, balanceSince: c.balanceSince || "", termsDays: c.termsDays || 0 });
  const orders = (data.orders as { id: number; grand: number; status: string; createdAt: string }[]).slice(0, 30);
  const events = (data.events as { at: string; kind: string; detail: string }[]).filter((e) => e.kind !== "order");
  return (
    <div className="wrap section max-w-2xl">
      <div id="statement" className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-black dark:border-white/10 dark:bg-white dark:text-black">
        <style>{`@media print {
          @page { size: A4; margin: 12mm; }
          body { background: #fff !important; }
          body * { visibility: hidden; }
          #statement, #statement * { visibility: visible; }
          #statement { position: absolute; inset: 0 auto auto 0; width: 100%; border: none; border-radius: 0; margin: 0; }
          nav[aria-label="Admin"], .impersonate-bar { display: none !important; }
        }`}</style>
        <div className="text-center">
          <p className="text-xl font-extrabold">{biz("biz_name") || "Statement of dues"}</p>
          {[biz("biz_address"), [biz("biz_city"), biz("biz_state"), biz("biz_pin")].filter(Boolean).join(" ")].filter(Boolean).join(", ")
            ? <p className="text-xs text-zinc-600">{[biz("biz_address"), [biz("biz_city"), biz("biz_state"), biz("biz_pin")].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</p>
            : null}
          {(biz("contact_phone") || biz("contact_email")) && (
            <p className="text-xs text-zinc-600">{[biz("contact_phone"), biz("contact_email")].filter(Boolean).join(" · ")}</p>
          )}
        </div>
        <hr className="my-3 border-black/20" />
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">Customer</p>
            <p className="font-bold">{c.name}{c.phone ? ` · ${c.phone}` : ""}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Balance due</p>
            <p className="text-xl font-extrabold">₹{(c.balance / 100).toFixed(0)}</p>
            <p className="text-xs font-bold">{st.label}{c.termsDays ? ` · ${c.termsDays}d terms` : ""}</p>
          </div>
        </div>
        {c.credit > 0 && <p className="mt-1 text-xs text-zinc-600">Credit limit ₹{(c.credit / 100).toFixed(0)}</p>}
        <PlansBlock customerId={cid} />
        <p className="mb-1 mt-4 font-bold">Credit orders ({orders.length})</p>
        {orders.length === 0 ? <p className="text-xs text-zinc-500">None on record.</p> : (
          <ul className="space-y-1 font-mono text-xs">
            {orders.map((o, i) => (
              <li key={i} className="flex justify-between gap-2"><span>#{o.id} · {o.createdAt.slice(0, 10)}</span><span>₹{(o.grand / 100).toFixed(0)} · {o.status}</span></li>
            ))}
          </ul>
        )}
        <p className="mb-1 mt-4 font-bold">Timeline ({events.length})</p>
        {events.length === 0 ? <p className="text-xs text-zinc-500">No events yet.</p> : (
          <ul className="space-y-1 text-xs">
            {events.slice(0, 20).map((e, i) => (
              <li key={i} className="flex justify-between gap-2"><span className="text-zinc-500">{e.at.slice(0, 16).replace("T", " ")}</span><span>{e.detail}</span></li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-center text-[11px] text-zinc-500">Please pay at the counter or via UPI. Keep this statement for your records.</p>
        <div className="mt-3 print:hidden"><PrintButton /></div>
      </div>
    </div>
  );
}
