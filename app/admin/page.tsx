import { totals, leadsPerDay, topPages, recentLeads, recentOrders, getDb } from "@/lib/store";

export default async function AdminHome() {
  const t = totals();
  const perDay = leadsPerDay(14);
  const max = Math.max(1, ...perDay.map((d) => d.n));
  const pages = topPages(8);
  const leads = recentLeads(8) as { id: number; name: string; phone: string; businessType: string; source: string; createdAt: string }[];
  const orders = recentOrders(8) as { id: number; title: string; amount: number; status: string; paid: number }[];
  const evalAvg = (getDb().prepare("SELECT COALESCE(AVG(score),0) a FROM Eval WHERE id > (SELECT COALESCE(MAX(id),0)-20 FROM Eval)").get() as { a: number }).a;
  const inngestMode = process.env.INNGEST_EVENT_KEY ? "cloud" : "local runner";
  const cards: [string, string][] = [
    ["Leads total", String(t.leads)],
    ["Leads today", String(t.leadsToday)],
    ["Events today", String(t.eventsToday)],
    ["Subscribers", String(t.subscribers)],
    ["Orders", String(t.orders)],
    ["Revenue paid ₹", String(t.revenue)],
    ["Reply eval avg", `${Math.round(evalAvg)}/100`],
    ["Jobs", inngestMode],
  ];
  return (
    <>
      <h1 className="text-2xl font-extrabold">Overview</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(([l, v]) => (
          <div key={l} className="glass rounded-2xl p-4">
            <p className="text-2xl font-extrabold">{v}</p>
            <p className="text-xs text-zinc-500">{l}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-8 font-bold">Leads per day (14d)</h2>
      <div className="mt-2 flex h-28 items-end gap-1" aria-hidden>
        {perDay.map((d) => (
          <div key={d.day} title={`${d.day}: ${d.n}`} className="flex-1 rounded-t bg-brand" style={{ height: `${Math.max(4, (d.n / max) * 100)}%` }} />
        ))}
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <div>
          <h2 className="font-bold">Top pages</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {pages.map((p) => <li key={p.path} className="flex justify-between gap-2"><span className="truncate">{p.path}</span><b>{p.n}</b></li>)}
            {pages.length === 0 && <li className="text-sm text-zinc-500">No page views yet.</li>}
          </ul>
        </div>
        <div>
          <h2 className="font-bold">Latest leads</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {leads.map((l) => <li key={l.id}>{l.name} · {l.phone} · {l.businessType}</li>)}
            {leads.length === 0 && <li className="text-sm text-zinc-500">No leads yet.</li>}
          </ul>
        </div>
        <div>
          <h2 className="font-bold">Latest orders</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {orders.map((o) => <li key={o.id}>#{o.id} {o.title} · ₹{o.amount} · {o.status} · paid ₹{o.paid}</li>)}
            {orders.length === 0 && <li className="text-sm text-zinc-500">No orders yet.</li>}
          </ul>
        </div>
      </div>
    </>
  );
}
