"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, KanbanSquare, ShoppingCart, FileText, ClipboardList,
  Blocks, Image, Mail, Bell, Handshake, KeyRound, ShieldCheck, Route, Settings, CalendarClock, Activity, Workflow, Plug, Menu, X, LogOut, Star, Package, GraduationCap, MessageSquare, MessageCircle, LayoutTemplate, Ticket, Trello, ListChecks, IndianRupee, Megaphone,
} from "lucide-react";

type Item = [string, string, React.ComponentType<{ size?: number; className?: string }>];

const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "Workspace", items: [
      ["Overview", "/admin", LayoutDashboard],
      ["Leads", "/admin/leads", Users],
      ["Pipeline", "/admin/pipeline", KanbanSquare],
      ["Boards", "/admin/boards", Trello],
      ["Todos", "/admin/todos", ListChecks],
      ["Calendar", "/admin/calendar", CalendarClock],
      ["Services", "/admin/services", ClipboardList],
      ["Schedule", "/admin/schedule", CalendarClock],
      ["Google", "/admin/google", Plug],
    ],
  },
  {
    label: "Sell", items: [
      ["Orders", "/admin/orders", ShoppingCart],
      ["Shop", "/admin/shop", ShoppingCart],
      ["Billing", "/admin/billing", IndianRupee],
      ["Retail", "/admin/retail", Megaphone],
      ["Stock", "/admin/stock", Package],
      ["Packages", "/admin/packages", Package],
      ["Partners", "/admin/partners", Handshake],
      ["Proof", "/admin/proof", Star],
      ["Pages", "/admin/pages", LayoutTemplate],
      ["CMS", "/admin/cms", Blocks],
      ["Blog", "/admin/blog", FileText],
      ["Media", "/admin/media", Image],
      ["Forms", "/admin/forms", ClipboardList],
    ],
  },
  {
    label: "Engage", items: [
      ["WhatsApp", "/admin/whatsapp", MessageCircle],
      ["CRM", "/admin/crm", Users],
      ["Comments", "/admin/comments", MessageSquare],
      ["Tickets", "/admin/tickets", Ticket],
      ["Subscribers", "/admin/subscribers", Mail],
      ["Notify", "/admin/notify", Bell],
    ],
  },
  {
    label: "System", items: [
      ["Ops", "/admin/ops", Activity],
      ["Flows", "/admin/flows", Workflow],
      ["Webhooks", "/admin/hooks", Plug],
      ["Keys", "/admin/keys", KeyRound],
      ["Learn", "/admin/learn", GraduationCap],
      ["Flags", "/admin/flags", ShieldCheck],
      ["Routes", "/admin/routes", Route],
      ["Settings", "/admin/settings", Settings],
    ],
  },
];

export function AdminDrawer({ email, role }: { email: string; role: string }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const active = (h: string) => (h === "/admin" ? path === h : path === h || path.startsWith(`${h}/`));
  const list = (
    <nav aria-label="Admin" className="grid gap-3">
      {GROUPS.map((g) => (
        <div key={g.label}>
          <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">{g.label}</p>
          <div className="grid gap-0.5">
            {g.items.map(([l, h, Icon]) => (
              <Link key={h} href={h} onClick={() => setOpen(false)} aria-current={active(h) ? "page" : undefined}
                className={`flex min-h-[44px] items-center gap-2.5 rounded-xl px-3 text-sm font-semibold transition-colors ${active(h)
                  ? "bg-brand/10 text-brand-deep dark:bg-brand/20"
                  : "hover:bg-black/5 dark:hover:bg-white/10"}`}>
                <Icon size={17} className="shrink-0 text-brand-deep" />{l}
              </Link>
            ))}
          </div>
        </div>
      ))}
      <form action="/api/auth/logout" method="post" className="mt-1">
        <button className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10">
          <LogOut size={17} className="shrink-0" />Sign out
        </button>
      </form>
    </nav>
  );
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3 md:hidden">
        <p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Admin · {email}</p>
        <button onClick={() => setOpen((o) => !o)} aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/10 dark:border-white/15">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && <div className="mb-4 md:hidden">{list}</div>}
      <aside className="hidden w-60 shrink-0 md:block">
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-black/10 p-3 dark:border-white/10">
          <p className="truncate px-2 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Admin · {role}</p>
          {list}
        </div>
      </aside>
    </>
  );
}
