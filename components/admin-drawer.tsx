"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard, Users, KanbanSquare, ShoppingCart, FileText, ClipboardList,
  Blocks, Image, Mail, Bell, Handshake, KeyRound, ShieldCheck, Route, Settings, CalendarClock, Activity, Workflow, Menu, X, LogOut, Star, Package, GraduationCap, MessageSquare, MessageCircle, LayoutTemplate, Ticket, Trello, ListChecks,
} from "lucide-react";

const NAV: [string, string, React.ComponentType<{ size?: number; className?: string }>][] = [
  ["Overview", "/admin", LayoutDashboard],
  ["Leads", "/admin/leads", Users],
  ["Pipeline", "/admin/pipeline", KanbanSquare],
  ["Boards", "/admin/boards", Trello],
  ["WhatsApp", "/admin/whatsapp", MessageCircle],
  ["Calendar", "/admin/calendar", CalendarClock],
  ["Schedule", "/admin/schedule", CalendarClock],
  ["Orders", "/admin/orders", ShoppingCart],
  ["Packages", "/admin/packages", Package],
  ["Blog", "/admin/blog", FileText],
  ["Comments", "/admin/comments", MessageSquare],
  ["Tickets", "/admin/tickets", Ticket],
  ["Pages", "/admin/pages", LayoutTemplate],
  ["Forms", "/admin/forms", ClipboardList],
  ["Todos", "/admin/todos", ListChecks],
  ["CMS", "/admin/cms", Blocks],
  ["Media", "/admin/media", Image],
  ["Subscribers", "/admin/subscribers", Mail],
  ["Proof", "/admin/proof", Star],
  ["Notify", "/admin/notify", Bell],
  ["Ops", "/admin/ops", Activity],
  ["Flows", "/admin/flows", Workflow],
  ["Partners", "/admin/partners", Handshake],
  ["Keys", "/admin/keys", KeyRound],
  ["Learn", "/admin/learn", GraduationCap],
  ["Flags", "/admin/flags", ShieldCheck],
  ["Routes", "/admin/routes", Route],
  ["Settings", "/admin/settings", Settings],
];

export function AdminDrawer({ email, role }: { email: string; role: string }) {
  const [open, setOpen] = useState(false);
  const list = (
    <nav aria-label="Admin" className="grid gap-1">
      {NAV.map(([l, h, Icon]) => (
        <Link key={h} href={h} onClick={() => setOpen(false)}
          className="flex min-h-[44px] items-center gap-2.5 rounded-xl px-3 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10">
          <Icon size={17} className="shrink-0 text-brand-deep" />{l}
        </Link>
      ))}
      <form action="/api/auth/logout" method="post" className="mt-2">
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
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/10 dark:border-white/15">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && <div className="mb-4 md:hidden">{list}</div>}
      <aside className="hidden w-60 shrink-0 md:block">
        <div className="sticky top-24 rounded-2xl border border-black/10 p-3 dark:border-white/10">
          <p className="truncate px-2 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Admin · {role}</p>
          {list}
        </div>
      </aside>
    </>
  );
}
