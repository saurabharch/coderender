// Pure quick-bar catalog (client-safe: NO store/sqlite imports).
export const QUICKBAR_ACTIONS = [
  { id: "pos", label: "POS", hint: "Counter billing, tender and receipts", href: "/admin/pos" },
  { id: "orders", label: "Orders", hint: "Order pipeline and status moves", href: "/admin/orders" },
  { id: "inventory", label: "Inventory", hint: "Products, batches and labels", href: "/admin/shop" },
  { id: "stock", label: "Stock", hint: "Levels, purchase orders and bins", href: "/admin/stock" },
  { id: "sales", label: "Sales", hint: "Campaigns, drawer and shipments", href: "/admin/retail" },
  { id: "bi", label: "BI", hint: "Revenue, funnel and expiry charts", href: "/admin/bi" },
  { id: "ai", label: "AI", hint: "Sales assistant chat toggle", action: "cr:chat-toggle" },
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

export const QUICKBAR_ROLES = ["owner", "manager", "sales", "cashier", "inventory", "customer", "accountant", "hr", "marketing", "author", "staff", "member"];

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
