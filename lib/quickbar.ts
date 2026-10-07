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
  sales: ["orders", "inventory", "ai"],
  cashier: ["orders"],
  inventory: ["inventory", "stock"],
  customer: ["orders", "inventory"],
};

// Center-scanner behavior per role: tray (stage items → open in POS),
// detail (product page + availability), hr (staff identity + attendance).
export type ScanMode = "tray" | "detail" | "hr";
const TRAY_ROLES = new Set(["owner", "manager", "admin", "cashier", "inventory", "staff", "member", "accountant"]);

export function scanMode(role: string): ScanMode {
  if (role === "hr") return "hr";
  if (TRAY_ROLES.has(role)) return "tray";
  return "detail";
}

export const BUSINESS_TYPES = ["shop", "ecommerce", "clinic"] as const;

export function businessType(): string {
  try {
    const t = getPref("business_type", "shop");
    return (BUSINESS_TYPES as readonly string[]).includes(t) ? t : "shop";
  } catch { return "shop"; }
}

const FALLBACK: QuickbarId[] = ["pos", "orders"];

export const QUICKBAR_ROLES = ["owner", "manager", "sales", "cashier", "inventory", "customer", "accountant", "hr", "marketing", "author", "staff", "member"];

export function quickbarCustom(): Record<string, string[]> {
  try { return JSON.parse(getPref("quickbar", "{}") || "{}"); } catch { return {}; }
}

export function resolveQuickbar(role: string): QuickbarId[] {
  const ids = new Set(QUICKBAR_ACTIONS.map((a) => a.id));
  const custom = quickbarCustom();
  let list = (custom[role] ?? QUICKBAR_DEFAULTS[role] ?? FALLBACK).filter((x): x is QuickbarId => ids.has(x as QuickbarId));
  // E-commerce storefronts lead with orders, not the counter.
  if (!custom[role] && businessType() === "ecommerce") list = list.filter((x) => x !== "pos");
  if (list.length === 0) list = FALLBACK.filter((x) => x !== "pos");
  return list.slice(0, 5);
}
