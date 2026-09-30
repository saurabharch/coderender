import Link from "next/link";
import { totals, leadsPerDay, topPages, recentLeads, recentOrders, upcomingMeetings, meetingCount, evalAvg } from "@/lib/store";
import { Users, CalendarClock, MousePointerClick, Mail, ShoppingCart, IndianRupee, Sparkles, Server } from "lucide-react";

export default async function AdminHome() {
  const t = totals();
  const perDay = leadsPerDay(14);
  const max = Math.max(1, ...perDay.map((d) => d.n));
  const pages = topPages(6);
  const leads = recentLeads(6) as { id: number; name: string; phone: string; businessType: string; source: string; createdAt: string }[];
  const orders = recentOrders(6) as { id: number; title: string; amount: number; status: string; paid: number }[];
  const meetings = upcomingMeetings(5) as { id: number; name: string; slot: string; mode: string; status: string }[];
  const avg = Math.round(evalAvg(20));
  const inngestMode = process.env.INNGEST_EVENT_KEY ? "cloud" : "local runner";
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const cards: { label: string; value: string; sub: string; Icon: typeof Users }[] = [
    { label: "Leads", value: String(t.leads), sub: `${t.leadsToday} today`, Icon: Users },
    { label: "Meetings booked", value: String(meetingCount()), sub: "upcoming", Icon: CalendarClock },
    { label: "Clicks today", value: String(t.eventsToday), sub: "tracked events", Icon: MousePointerClick },
    { label: "Subscribers", value: String(t.subscribers), sub: "newsletter", Icon: Mail },
    { label: "Orders", value: String(t.orders), sub: "pipeline", Icon: ShoppingCart },
    { label: "Revenue paid", value: `₹${t.revenue}`, sub: "collected", Icon: IndianRupee },
    { label: "Reply quality", value: `${avg}/100`, sub: "heuristic eval", Icon: Sparkles },
    { label: "Jobs", value: inngestMode, sub: "durable layer", Icon: Server },
  ];
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">{today}</p>
      <h1 className="display-2 mt-1">Good day — here is the business at a glance.</h1>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, sub, Icon }) => (
          <div key={label} className="glass rounded-2xl p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500"><Icon size={14} />{label}</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight">{value}</p>
            <p className="text-xs text-zinc-500">{sub}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <div className="glass rounded-2xl p-5 lg:col-span-3">
          <p className="font-bold">Leads per day <span className="text-xs font-semibold text-zinc-500">· 14 days</span></p>
          <div className="mt-3 flex h-32 items-end gap-1" aria-hidden>
            {perDay.map((d) => (
              <div key={d.day} title={`${d.day}: ${d.n}`} className="flex-1 rounded-t bg-brand" style={{ height: `${Math.max(4, (d.n / max) * 100)}%` }} />
            ))}
          </div>
          <p className="mt-3 font-bold">Top pages</p>
          <ul className="mt-1 space-y-1 text-sm">
            {pages.map((p) => <li key={p.path} className="flex justify-between gap-2"><span className="truncate">{p.path}</span><b>{p.n}</b></li>)}
            {pages.length === 0 && <li className="text-sm text-zinc-500">No page views yet.</li>}
          </ul>
        </div>
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <p className="flex items-center justify-between font-bold">Upcoming meetings <Link href="/admin/schedule" className="inline-flex min-h-[44px] items-center rounded-full border border-black/10 px-3 text-xs font-semibold dark:border-white/15">all →</Link></p>
          <ul className="mt-2 space-y-2 text-sm">
            {meetings.map((m) => (
              <li key={m.id} className="rounded-xl bg-white/60 p-2.5 dark:bg-white/5">
                <b>{m.slot || "Unscheduled"}</b> · {m.name} · {m.mode} · {m.status}
              </li>
            ))}
            {meetings.length === 0 && <li className="text-sm text-zinc-500">None booked — widget bookings land here.</li>}
          </ul>
          <p className="mt-4 font-bold">Latest leads</p>
          <ul className="mt-1 space-y-1 text-sm">
            {leads.map((l) => <li key={l.id}>{l.name} · {l.phone} · {l.businessType} · {l.source}</li>)}
            {leads.length === 0 && <li className="text-sm text-zinc-500">No leads yet.</li>}
          </ul>
          <p className="mt-4 font-bold">Latest orders</p>
          <ul className="mt-1 space-y-1 text-sm">
            {orders.map((o) => <li key={o.id}>#{o.id} {o.title} · ₹{o.amount} · {o.status} · paid ₹{o.paid}</li>)}
            {orders.length === 0 && <li className="text-sm text-zinc-500">No orders yet.</li>}
          </ul>
        </div>
      </div>
    </>
  );
}
