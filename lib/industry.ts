import { getDb, getPref, setPref } from "./store";
import { VERTICALS } from "./site";

// Business control plane (server only): industry registry + per-industry
// dashboard route visibility. RBAC still gates access; this only controls
// which options the drawer shows.
export interface Industry {
  slug: string; label: string; mode: string; active: number;
}

export function industryTables(): void {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS Industry (slug TEXT PRIMARY KEY, label TEXT NOT NULL DEFAULT '', mode TEXT NOT NULL DEFAULT 'hybrid', active INTEGER NOT NULL DEFAULT 1)`);
  for (const v of VERTICALS) {
    db.prepare("INSERT INTO Industry (slug, label, mode) VALUES (?,?,?) ON CONFLICT(slug) DO UPDATE SET label=excluded.label")
      .run(v.slug, v.label, "hybrid");
  }
}

export function listIndustries(): Industry[] {
  industryTables();
  return getDb().prepare("SELECT * FROM Industry ORDER BY label").all() as unknown as Industry[];
}

export function saveIndustry(slug: string, label: string, mode: string): void {
  industryTables();
  const s = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  if (!s) throw new Error("bad slug");
  const m = ["online", "offline", "hybrid"].includes(mode) ? mode : "hybrid";
  getDb().prepare("INSERT INTO Industry (slug, label, mode) VALUES (?,?,?) ON CONFLICT(slug) DO UPDATE SET label=excluded.label, mode=excluded.mode")
    .run(s, label.trim().slice(0, 120) || s, m);
}

export function setIndustryActive(slug: string, on: boolean): void {
  industryTables();
  getDb().prepare("UPDATE Industry SET active=? WHERE slug=?").run(on ? 1 : 0, slug);
}

// Dashboard routes manageable per industry (href + label + group).
export const DASHBOARD_ROUTES = [
  { href: "/admin", label: "Overview", group: "Sell" },
  { href: "/admin/pos", label: "POS", group: "Sell" },
  { href: "/admin/orders", label: "Orders", group: "Sell" },
  { href: "/admin/shop", label: "Inventory", group: "Sell" },
  { href: "/admin/billing", label: "Billing", group: "Sell" },
  { href: "/admin/retail", label: "Retail", group: "Sell" },
  { href: "/admin/stock", label: "Stock", group: "Sell" },
  { href: "/admin/crm", label: "CRM", group: "Engage" },
  { href: "/admin/customers", label: "Customers", group: "Engage" },
  { href: "/admin/services", label: "Services", group: "Engage" },
  { href: "/admin/boards", label: "Boards", group: "Plan" },
  { href: "/admin/calendar", label: "Calendar", group: "Plan" },
  { href: "/admin/schedule", label: "Schedule", group: "Plan" },
  { href: "/admin/people", label: "People", group: "Team" },
  { href: "/admin/bi", label: "BI", group: "System" },
  { href: "/admin/learn", label: "Learn", group: "System" },
  { href: "/admin/flows", label: "Flows", group: "System" },
  { href: "/admin/notify", label: "Notify", group: "System" },
  { href: "/admin/media", label: "Media", group: "System" },
  { href: "/admin/blog", label: "Blog", group: "System" },
  { href: "/admin/forms", label: "Forms", group: "System" },
  { href: "/admin/keys", label: "API keys", group: "System" },
  { href: "/admin/flags", label: "Flags", group: "System" },
  { href: "/admin/routes", label: "Routes", group: "System" },
  { href: "/admin/settings", label: "Settings", group: "System" },
];

function routesMap(): Record<string, string[]> {
  try {
    const row = getDb().prepare("SELECT value FROM Preference WHERE key='industry_routes'").get() as
      { value: string } | undefined;
    const parsed: unknown = JSON.parse(row?.value ?? "{}");
    if (parsed && typeof parsed === "object") return parsed as Record<string, string[]>;
    return {};
  } catch { return {}; }
}

function writeRoutesMap(m: Record<string, string[]>): void {
  setPref("industry_routes", JSON.stringify(m));
}

/** Visible hrefs for an industry, or null when it uses the full dashboard. */
export function visibleRoutes(industry: string): string[] | null {
  const list = routesMap()[industry];
  if (!list) return null;
  const known = new Set(DASHBOARD_ROUTES.map((r) => r.href));
  const clean = list.filter((h) => known.has(h));
  return clean;
}

export function setIndustryRoutes(industry: string, hrefs: string[]): void {
  industryTables();
  const known = new Set(DASHBOARD_ROUTES.map((r) => r.href));
  const clean = [...new Set(hrefs)].filter((h) => known.has(h));
  const m = routesMap();
  if (clean.length >= DASHBOARD_ROUTES.length) delete m[industry];
  else m[industry] = clean;
  writeRoutesMap(m);
}

export function businessIndustry(): string {
  try {
    const s = getPref("business_industry", "");
    if (!s) return "";
    const row = getDb().prepare("SELECT slug FROM Industry WHERE slug=? AND active=1").get(s) as
      { slug: string } | undefined;
    return row?.slug ?? "";
  } catch { return ""; }
}
