import { PageHead } from "@/components/admin-ui";
import { ProviderTabs } from "@/components/provider-tabs";
import { gatewayStatus } from "@/lib/gateways";
import { NoSsr } from "@/components/no-ssr";

export default function PaymentsPage() {
  const st = gatewayStatus();
  const order = ["razorpay", "payu", "easebuzz", "stripe", "paytm", "wise", "autumn"];
  return (
    <>
      <PageHead eyebrow="Sell" title="Payments & gateways"
        blurb="Collect online: India via Razorpay, PayU, Paytm · international via Stripe · payouts via Wise · Autumn mirrors bills as a third-party biller. Test keys first, then go live per provider." />
      <ul className="mb-4 flex flex-wrap gap-1.5 text-xs" aria-label="Gateway status">
        {order.filter((k) => st[k]).map((k) => (
          <li key={k}
            className={`rounded-full border px-3 py-1.5 font-semibold capitalize ${st[k].configured
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-black/10 text-zinc-500 dark:border-white/15"}`}>
            {k} · {st[k].configured ? `${st[k].mode} ✓` : "not set"}
          </li>
        ))}
      </ul>
      <div className="mb-4 rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 text-sm">
        <p><b>Go-live order per provider:</b> paste <b>test</b> keys → Save → Test → take a test payment → set Environment to <b>Live</b> → paste live keys → Save → Test again.</p>
        <p className="mt-1 text-zinc-500">Webhooks: add <span className="font-mono">APP_URL/api/pay/callback</span> in each provider&apos;s dashboard and save its signing secret here. Missing keys never crash checkout — customers see an honest “unavailable” and the original order is kept.</p>
      </div>
      <NoSsr>
        <ProviderTabs only={["razorpay", "payu", "easebuzz", "stripe", "paytm", "wise", "autumn"]} />
      </NoSsr>
    </>
  );
}
