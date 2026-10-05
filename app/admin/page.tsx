import Link from "next/link";
import { totals, leadsPerDay, topPages, recentLeads, recentOrders, upcomingMeetings, meetingCount, evalAvg, getDb } from "@/lib/store";
import { lowStockList } from "@/lib/inventory";
import { attentionFeed } from "@/lib/crm";
import { hasPerm } from "@/lib/scale-core";
import { sessionUser } from "@/lib/auth";
import { Users, CalendarClock, MousePointerClick, Mail, ShoppingCart, IndianRupee, Sparkles, Server, Package, Wallet } from "lucide-react";
import { Empty, Stat } from "@/components/admin-ui";

export default async function AdminHome() {
  const t = totals();
  const todaySales = () => {
    try {
      return ((getDb().prepare("SELECT COALESCE(SUM(grand),0) s FROM ShopOrder WHERE date(createdAt)=date('now') AND status!='cancelled'").get() as { s: number }).s / 100).toFixed(0);
    } catch { return "0"; }
  };
  const openRecv = () => {
    try {
      return ((getDb().prepare("SELECT COALESCE(SUM(grand),0) s FROM BillDoc WHERE status IN ('sent','overdue')").get() as { s: number }).s / 100).toFixed(0);
    } catch { return "0"; }
  };
  const teamSize = () => {
    try {
      return (getDb().prepare("SELECT COUNT(*) c FROM Employee WHERE active=1").get() as { c: number }).c;
    } catch { return 0; }
  };
  const perDay = leadsPerDay(14);
  const max = Math.max(1, ...perDay.map((d) => d.n));
  const pages = topPages(6);
  const leads = recentLeads(6) as { id: number; name: string; phone: string; businessType: string; source: string; createdAt: string }[];
  const orders = recentOrders(6) as { id: number; title: string; amount: number; status: string; paid: number }[];
  const meetings = upcomingMeetings(5) as { id: number; name: string; slot: string; mode: string; status: string }[];
  const avg = Math.round(evalAvg(20));
  const inngestMode = process.env.INNGEST_EVENT_KEY ? "cloud" : "local runner";
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const cards: { label: string; value: string; sub: string; Icon: typeof Users; href: string }[] = [
    { label: "Leads", value: String(t.leads), sub: `${t.leadsToday} today`, Icon: Users, href: "/admin/leads" },
    { label: "Meetings booked", value: String(meetingCount()), sub: "upcoming", Icon: CalendarClock, href: "/admin/schedule" },
    { label: "Clicks today", value: String(t.eventsToday), sub: "tracked events", Icon: MousePointerClick, href: "/admin/routes" },
    { label: "Subscribers", value: String(t.subscribers), sub: "newsletter", Icon: Mail, href: "/admin/subscribers" },
    { label: "Orders", value: String(t.orders), sub: "pipeline", Icon: ShoppingCart, href: "/admin/orders" },
    { label: "Revenue paid", value: `₹${t.revenue}`, sub: "collected", Icon: IndianRupee, href: "/admin/orders" },
    { label: "Reply quality", value: `${avg}/100`, sub: "heuristic eval", Icon: Sparkles, href: "/admin/learn" },
    { label: "Jobs", value: inngestMode, sub: "durable layer", Icon: Server, href: "/admin/ops" },
  ];
  // Role-tailored home: each role sees its own numbers first (owner/manager see all).
  const me = await sessionUser();
  const role = me?.role ?? "staff";
  const roleCards: Record<string, typeof cards> = {
    cashier: [
      { label: "Counter sales today", value: `₹${todaySales()}`, sub: "pos channel", Icon: ShoppingCart, href: "/admin/retail" },
      { label: "Orders", value: String(t.orders), sub: "pipeline", Icon: ShoppingCart, href: "/admin/orders" },
    ],
    inventory: [
      { label: "Low stock", value: String(lowStockList().length), sub: "needs purchase", Icon: Package, href: "/admin/stock" },
      { label: "Orders", value: String(t.orders), sub: "pipeline", Icon: ShoppingCart, href: "/admin/orders" },
    ],
    accountant: [
      { label: "Receivables open", value: `₹${openRecv()}`, sub: "bills sent", Icon: Wallet, href: "/admin/billing" },
      { label: "Revenue paid", value: `₹${t.revenue}`, sub: "collected", Icon: IndianRupee, href: "/admin/orders" },
    ],
    hr: [
      { label: "Team", value: String(teamSize()), sub: "active employees", Icon: Users, href: "/admin/people" },
      { label: "Meetings booked", value: String(meetingCount()), sub: "upcoming", Icon: CalendarClock, href: "/admin/schedule" },
    ],
    marketing: [
      { label: "Subscribers", value: String(t.subscribers), sub: "newsletter", Icon: Mail, href: "/admin/subscribers" },
      { label: "Clicks today", value: String(t.eventsToday), sub: "tracked events", Icon: MousePointerClick, href: "/admin/routes" },
    ],
    sales: [
      { label: "Leads", value: String(t.leads), sub: `${t.leadsToday} today`, Icon: Users, href: "/admin/leads" },
      { label: "Orders", value: String(t.orders), sub: "pipeline", Icon: ShoppingCart, href: "/admin/orders" },
    ],
  };
  const full = ["owner", "manager", "member"].includes(role);
  const shown = full ? cards : (roleCards[role] ?? [
    { label: "Boards", value: "workspace", sub: "your tasks live here", Icon: Users, href: "/admin/boards" },
    { label: "Meetings booked", value: String(meetingCount()), sub: "upcoming", Icon: CalendarClock, href: "/admin/schedule" },
  ]);
  const attn = hasPerm(role, "reports") ? attentionFeed().slice(0, 4) : [];
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">{today} · {role}</p>
      <h1 className="display-2 mt-1">Good day — here is the business at a glance.</h1>
      {attn.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-sm">
          {attn.map((a, i) => (
            <li key={i} className="rounded-xl border border-amber-500/40 px-3 py-2">
              <Link href={a.href} className="underline">{a.text} →</Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {shown.map((c) => <Stat key={c.label} {...c} />)}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <div className="glass rounded-2xl p-5 lg:col-span-3">
          <p className="font-bold">Leads per day <span className="text-xs font-semibold text-zinc-500">· 14 days</span></p>
          <div className="mt-3 flex h-32 items-end gap-1" role="img" aria-label={`Leads per day, peak ${max}`}>
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
          {meetings.length > 0 ? (
            <ul className="mt-2 space-y-2 text-sm">
              {meetings.map((m) => (
                <li key={m.id} className="rounded-xl bg-white/60 p-2.5 dark:bg-white/5">
                  <b>{m.slot || "Unscheduled"}</b> · {m.name} · {m.mode} · {m.status}
                </li>
              ))}
            </ul>
          ) : <div className="mt-2"><Empty>None booked — widget bookings land here.</Empty></div>}
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
