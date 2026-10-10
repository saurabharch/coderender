"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, KanbanSquare, ShoppingCart, UtensilsCrossed, CookingPot, FileText, ClipboardList,
  Blocks, Image, Mail, Bell, Handshake, KeyRound, ShieldCheck, Route, Settings, CalendarClock, Activity, Workflow, Plug, Menu, X, LogOut, Star, Package, GraduationCap, MessageSquare, MessageCircle, LayoutTemplate, Ticket, Trello, ListChecks, IndianRupee, CreditCard, Megaphone, Contact,
} from "lucide-react";

import { hasPerm } from "@/lib/scale-core";
import type { Perm } from "@/lib/scale-core";
import { NAV_GROUPS } from "@/lib/nav-catalog";

type IconType = React.ComponentType<{ size?: number; className?: string }>;

// Icons by href (catalog owns labels/groups/perms; this map owns visuals).
const ICONS: Record<string, IconType> = {
  "/admin": LayoutDashboard,
  "/admin/bi": Activity,
  "/admin/google": Plug,
  "/admin/orders": ShoppingCart,
  "/admin/pos": ShoppingCart,
  "/admin/shop": ShoppingCart,
  "/admin/billing": IndianRupee,
  "/admin/payments": CreditCard,
  "/admin/retail": Megaphone,
  "/admin/stock": Package,
  "/admin/packages": Package,
  "/admin/partners": Handshake,
  "/admin/dine": UtensilsCrossed,
  "/admin/kitchen": CookingPot,
  "/admin/venues": LayoutTemplate,
  "/admin/leads": Users,
  "/admin/pipeline": KanbanSquare,
  "/admin/whatsapp": MessageCircle,
  "/admin/crm": Users,
  "/admin/customers": Contact,
  "/admin/comments": MessageSquare,
  "/admin/tickets": Ticket,
  "/admin/subscribers": Mail,
  "/admin/notify": Bell,
  "/admin/proof": Star,
  "/admin/pages": LayoutTemplate,
  "/admin/cms": Blocks,
  "/admin/blog": FileText,
  "/admin/media": Image,
  "/admin/forms": ClipboardList,
  "/admin/boards": Trello,
  "/admin/todos": ListChecks,
  "/admin/calendar": CalendarClock,
  "/admin/schedule": CalendarClock,
  "/admin/services": ClipboardList,
  "/admin/people": Users,
  "/admin/ops": Activity,
  "/admin/scale": ShieldCheck,
  "/admin/flows": Workflow,
  "/admin/hooks": Plug,
  "/admin/keys": KeyRound,
  "/admin/learn": GraduationCap,
  "/admin/flags": ShieldCheck,
  "/admin/routes": Route,
  "/admin/settings": Settings,
};

const GROUPS = NAV_GROUPS;

export function AdminDrawer({ email, role, visible }: { email: string; role: string; visible: string[] | null }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const can = (p: Perm | "any") => p === "any" || hasPerm(role, p);
  const active = (h: string) => (h === "/admin" ? path === h : path === h || path.startsWith(`${h}/`));
  const list = (
    <nav aria-label="Admin" className="grid gap-3">
      {GROUPS.map((g) => {
        const items = g.items.filter((it) => can(it.perm) && (!visible || visible.includes(it.href) || it.href === "/admin/settings"));
        if (!items.length) return null;
        return (
        <div key={g.label}>
          <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">{g.label}</p>
          <div className="grid gap-0.5">
            {items.map((it) => {
              const Icon = ICONS[it.href] ?? LayoutDashboard;
              return (
              <Link key={it.href} href={it.href} onClick={() => setOpen(false)} aria-current={active(it.href) ? "page" : undefined}
                className={`flex min-h-[44px] items-center gap-2.5 rounded-xl px-3 text-sm font-semibold transition-colors ${active(it.href)
                  ? "bg-brand/10 text-brand-deep dark:bg-brand/20"
                  : "hover:bg-black/5 dark:hover:bg-white/10"}`}>
                <Icon size={17} className="shrink-0 text-brand-deep" />{it.label}
              </Link>
              );
            })}
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
