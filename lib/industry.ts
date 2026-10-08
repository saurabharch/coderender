import { getDb, getPref, setPref } from "./store";
import { VERTICALS } from "./site";
import { NAV_GROUPS, NAV_MODES, allNavHrefs, applyModeVisible, type NavMode } from "./nav-catalog";

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

// Dashboard routes manageable per industry AND per business mode. Single
// source is the nav catalog, so every drawer entry is manageable (previously
// only a 25-href subset was).
export const DASHBOARD_ROUTES = NAV_GROUPS.flatMap((g) =>
  g.items.map((i) => ({ href: i.href, label: i.label, group: g.label })),
);

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

/** Business mode of the operating industry ("" when none selected). */
export function businessMode(): string {
  try {
    const slug = businessIndustry();
    if (!slug) return "";
    const row = getDb().prepare("SELECT mode FROM Industry WHERE slug=?").get(slug) as
      { mode: string } | undefined;
    const m = row?.mode ?? "";
    return (NAV_MODES as readonly string[]).includes(m) ? m : "";
  } catch { return ""; }
}

function modeMap(): Record<string, string[]> {
  try {
    const row = getDb().prepare("SELECT value FROM Preference WHERE key='mode_routes'").get() as
      { value: string } | undefined;
    const parsed: unknown = JSON.parse(row?.value ?? "{}");
    if (parsed && typeof parsed === "object") return parsed as Record<string, string[]>;
    return {};
  } catch { return {}; }
}

/** Visible hrefs for a business mode, or null when it uses the full dashboard. */
export function visibleForMode(mode: string): string[] | null {
  const list = modeMap()[mode];
  if (!list) return null;
  const known = new Set(allNavHrefs());
  const clean = [...new Set(list)].filter((h) => known.has(h));
  return clean;
}

export function setModeRoutes(mode: string, hrefs: string[]): void {
  if (!(NAV_MODES as readonly string[]).includes(mode)) return;
  const known = new Set(allNavHrefs());
  const clean = [...new Set(hrefs)].filter((h) => known.has(h));
  const m = modeMap();
  if (clean.length >= known.size) delete m[mode];
  else m[mode] = clean;
  setPref("mode_routes", JSON.stringify(m));
}

/**
 * Effective drawer list: per-industry list intersected with the operating
 * mode's list. Null = full dashboard. RBAC still gates access underneath.
 */
export function resolveVisible(): string[] | null {
  const biz = businessIndustry();
  const base = biz ? visibleRoutes(biz) : null;
  const mode = businessMode();
  if (!mode) return base;
  return applyModeVisible(base, modeMap(), mode);
}

export type { NavMode };
