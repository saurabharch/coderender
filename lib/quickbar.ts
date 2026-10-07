import { getPref } from "./store";

// Staff quick-bar catalog + resolver (server only — reads the dashboard pref).
export const QUICKBAR_ACTIONS = [
  { id: "pos", label: "POS", href: "/admin/pos" },
  { id: "orders", label: "Orders", href: "/admin/orders" },
  { id: "inventory", label: "Inventory", href: "/admin/shop" },
  { id: "stock", label: "Stock", href: "/admin/stock" },
  { id: "sales", label: "Sales", href: "/admin/retail" },
  { id: "bi", label: "BI", href: "/admin/bi" },
  { id: "ai", label: "AI", action: "cr:chat-toggle" },
] as const;

export type QuickbarId = (typeof QUICKBAR_ACTIONS)[number]["id"];

export const QUICKBAR_DEFAULTS: Record<string, QuickbarId[]> = {
  owner: ["pos", "orders", "inventory", "ai", "bi"],
  manager: ["pos", "orders", "inventory", "ai", "bi"],
  sales: ["pos", "orders", "ai"],
  cashier: ["pos", "orders"],
  inventory: ["inventory", "stock"],
  customer: ["orders", "inventory"],
};

const FALLBACK: QuickbarId[] = ["pos", "orders"];

export const QUICKBAR_ROLES = ["owner", "manager", "sales", "cashier", "inventory", "customer", "accountant", "hr", "marketing", "author", "staff", "member"];

export function quickbarCustom(): Record<string, string[]> {
  try { return JSON.parse(getPref("quickbar", "{}") || "{}"); } catch { return {}; }
}

export function resolveQuickbar(role: string): QuickbarId[] {
  const ids = new Set(QUICKBAR_ACTIONS.map((a) => a.id));
  const custom = quickbarCustom();
  const list = (custom[role] ?? QUICKBAR_DEFAULTS[role] ?? FALLBACK).filter((x): x is QuickbarId => ids.has(x as QuickbarId));
  return list.length > 0 ? list.slice(0, 5) : FALLBACK;
}
