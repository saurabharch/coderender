// Pure nav catalog (no sqlite — safe for vitest + client import). Single source
// for the admin drawer groups, per-industry route lists, and per-mode lists.
// RBAC still gates access; all of this only controls which options show.
import type { Perm } from "./scale-core";

export interface NavItem {
  label: string;
  href: string;
  perm: Perm | "any";
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace", items: [
      { label: "Overview", href: "/admin", perm: "any" },
      { label: "BI", href: "/admin/bi", perm: "reports" },
      { label: "Google", href: "/admin/google", perm: "any" },
    ],
  },
  {
    label: "Sell", items: [
      { label: "Orders", href: "/admin/orders", perm: "sell" },
      { label: "POS", href: "/admin/pos", perm: "sell" },
      { label: "Inventory", href: "/admin/shop", perm: "sell" },
      { label: "Billing", href: "/admin/billing", perm: "billing" },
      { label: "Payments", href: "/admin/payments", perm: "billing" },
      { label: "Retail", href: "/admin/retail", perm: "retail" },
      { label: "Stock", href: "/admin/stock", perm: "stock" },
      { label: "Packages", href: "/admin/packages", perm: "sell" },
      { label: "Partners", href: "/admin/partners", perm: "partners" },
      { label: "Dine", href: "/admin/dine", perm: "sell" },
      { label: "Venues", href: "/admin/venues", perm: "sell" },
      { label: "Kitchen", href: "/admin/kitchen", perm: "sell" },
      { label: "Leads", href: "/admin/leads", perm: "crm" },
      { label: "Pipeline", href: "/admin/pipeline", perm: "crm" },
    ],
  },
  {
    label: "Engage", items: [
      { label: "WhatsApp", href: "/admin/whatsapp", perm: "crm" },
      { label: "CRM", href: "/admin/crm", perm: "crm" },
      { label: "Customers", href: "/admin/customers", perm: "crm" },
      { label: "Comments", href: "/admin/comments", perm: "marketing" },
      { label: "Tickets", href: "/admin/tickets", perm: "crm" },
      { label: "Subscribers", href: "/admin/subscribers", perm: "marketing" },
      { label: "Notify", href: "/admin/notify", perm: "marketing" },
      { label: "Proof", href: "/admin/proof", perm: "marketing" },
      { label: "Pages", href: "/admin/pages", perm: "marketing" },
      { label: "CMS", href: "/admin/cms", perm: "marketing" },
      { label: "Blog", href: "/admin/blog", perm: "marketing" },
      { label: "Media", href: "/admin/media", perm: "marketing" },
      { label: "Forms", href: "/admin/forms", perm: "any" },
    ],
  },
  {
    label: "Plan", items: [
      { label: "Boards", href: "/admin/boards", perm: "any" },
      { label: "Todos", href: "/admin/todos", perm: "any" },
      { label: "Calendar", href: "/admin/calendar", perm: "any" },
      { label: "Schedule", href: "/admin/schedule", perm: "any" },
      { label: "Services", href: "/admin/services", perm: "services" },
    ],
  },
  {
    label: "Team", items: [
      { label: "People", href: "/admin/people", perm: "people" },
    ],
  },
  {
    label: "System", items: [
      { label: "Ops", href: "/admin/ops", perm: "reports" },
      { label: "Scale", href: "/admin/scale", perm: "settings" },
      { label: "Flows", href: "/admin/flows", perm: "settings" },
      { label: "Webhooks", href: "/admin/hooks", perm: "settings" },
      { label: "Api Keys", href: "/admin/keys", perm: "keys" },
      { label: "Learn", href: "/admin/learn", perm: "reports" },
      { label: "Flags", href: "/admin/flags", perm: "settings" },
      { label: "Routes", href: "/admin/routes", perm: "reports" },
      { label: "Settings", href: "/admin/settings", perm: "settings" },
    ],
  },
];

export const NAV_MODES = ["offline", "online", "hybrid"] as const;
export type NavMode = (typeof NAV_MODES)[number];

/** Flat href list of the whole catalog (order-stable). */
export function allNavHrefs(): string[] {
  return NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));
}

/**
 * Intersect a base visible list with a per-mode list. Either side null/empty
 * means "no restriction from that side". Pure — unit-tested.
 */
export function applyModeVisible(
  base: string[] | null, modeMap: Record<string, string[]>, mode: string,
): string[] | null {
  const all = allNavHrefs();
  const known = new Set(all);
  const cleanBase = base ? [...new Set(base)].filter((h) => known.has(h)) : null;
  const list = modeMap[mode];
  if (!list) return cleanBase;
  const cleanMode = [...new Set(list)].filter((h) => known.has(h));
  if (cleanMode.length >= all.length) return cleanBase;
  if (!cleanBase) return cleanMode;
  const keep = new Set(cleanMode);
  return cleanBase.filter((h) => keep.has(h));
}
