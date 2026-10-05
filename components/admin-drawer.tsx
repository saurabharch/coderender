"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, KanbanSquare, ShoppingCart, FileText, ClipboardList,
  Blocks, Image, Mail, Bell, Handshake, KeyRound, ShieldCheck, Route, Settings, CalendarClock, Activity, Workflow, Plug, Menu, X, LogOut, Star, Package, GraduationCap, MessageSquare, MessageCircle, LayoutTemplate, Ticket, Trello, ListChecks, IndianRupee, Megaphone, Contact,
} from "lucide-react";

import { hasPerm } from "@/lib/scale-core";
import type { Perm } from "@/lib/scale-core";

type Item = [string, string, React.ComponentType<{ size?: number; className?: string }>, Perm | "any"];

// Fourth element = required permission ("any" = every signed-in team member).
const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "Workspace", items: [
      ["Overview", "/admin", LayoutDashboard, "any"],
      ["BI", "/admin/bi", Activity, "reports"],
      ["Leads", "/admin/leads", Users, "crm"],
      ["Pipeline", "/admin/pipeline", KanbanSquare, "crm"],
      ["Boards", "/admin/boards", Trello, "any"],
      ["Todos", "/admin/todos", ListChecks, "any"],
      ["Calendar", "/admin/calendar", CalendarClock, "any"],
      ["People", "/admin/people", Users, "people"],
      ["Services", "/admin/services", ClipboardList, "services"],
      ["Schedule", "/admin/schedule", CalendarClock, "any"],
      ["Google", "/admin/google", Plug, "any"],
    ],
  },
  {
    label: "Sell", items: [
      ["Orders", "/admin/orders", ShoppingCart, "sell"],
      ["Shop", "/admin/shop", ShoppingCart, "sell"],
      ["Billing", "/admin/billing", IndianRupee, "billing"],
      ["Retail", "/admin/retail", Megaphone, "retail"],
      ["Stock", "/admin/stock", Package, "stock"],
      ["Packages", "/admin/packages", Package, "sell"],
      ["Partners", "/admin/partners", Handshake, "partners"],
      ["Proof", "/admin/proof", Star, "marketing"],
      ["Pages", "/admin/pages", LayoutTemplate, "marketing"],
      ["CMS", "/admin/cms", Blocks, "marketing"],
      ["Blog", "/admin/blog", FileText, "marketing"],
      ["Media", "/admin/media", Image, "marketing"],
      ["Forms", "/admin/forms", ClipboardList, "any"],
    ],
  },
  {
    label: "Engage", items: [
      ["WhatsApp", "/admin/whatsapp", MessageCircle, "crm"],
      ["CRM", "/admin/crm", Users, "crm"],
      ["Customers", "/admin/customers", Contact, "crm"],
      ["Comments", "/admin/comments", MessageSquare, "marketing"],
      ["Tickets", "/admin/tickets", Ticket, "crm"],
      ["Subscribers", "/admin/subscribers", Mail, "marketing"],
      ["Notify", "/admin/notify", Bell, "marketing"],
    ],
  },
  {
    label: "System", items: [
      ["Ops", "/admin/ops", Activity, "reports"],
      ["Scale", "/admin/scale", ShieldCheck, "settings"],
      ["Flows", "/admin/flows", Workflow, "settings"],
      ["Webhooks", "/admin/hooks", Plug, "settings"],
      ["Keys", "/admin/keys", KeyRound, "keys"],
      ["Learn", "/admin/learn", GraduationCap, "reports"],
      ["Flags", "/admin/flags", ShieldCheck, "settings"],
      ["Routes", "/admin/routes", Route, "reports"],
      ["Settings", "/admin/settings", Settings, "settings"],
    ],
  },
];

export function AdminDrawer({ email, role }: { email: string; role: string }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const can = (p: Perm | "any") => p === "any" || hasPerm(role, p);
  const active = (h: string) => (h === "/admin" ? path === h : path === h || path.startsWith(`${h}/`));
  const list = (
    <nav aria-label="Admin" className="grid gap-3">
      {GROUPS.map((g) => {
        const items = g.items.filter(([, , , p]) => can(p));
        if (!items.length) return null;
        return (
        <div key={g.label}>
          <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">{g.label}</p>
          <div className="grid gap-0.5">
            {items.map(([l, h, Icon]) => (
              <Link key={h} href={h} onClick={() => setOpen(false)} aria-current={active(h) ? "page" : undefined}
                className={`flex min-h-[44px] items-center gap-2.5 rounded-xl px-3 text-sm font-semibold transition-colors ${active(h)
                  ? "bg-brand/10 text-brand-deep dark:bg-brand/20"
                  : "hover:bg-black/5 dark:hover:bg-white/10"}`}>
                <Icon size={17} className="shrink-0 text-brand-deep" />{l}
              </Link>
            ))}
          </div>
        </div>
        );
      })}
      <form action="/api/auth/logout" method="post" className="mt-1">
        <button className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10">
          <LogOut size={17} className="shrink-0" />Sign out
        </button>
      </form>
      <p className="px-2 pt-2 text-[11px] text-zinc-400">Tip: <kbd className="rounded border border-black/15 px-1 font-mono dark:border-white/20">Ctrl K</kbd> to search</p>
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
