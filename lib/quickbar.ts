import { getPref } from "./store";
import {
  QUICKBAR_ACTIONS, QUICKBAR_DEFAULTS, BUSINESS_TYPES,
  type QuickbarId,
} from "./quickbar-catalog";

export { QUICKBAR_ACTIONS, QUICKBAR_DEFAULTS, QUICKBAR_ROLES, BUSINESS_TYPES, scanMode } from "./quickbar-catalog";
export type { QuickbarId, ScanMode } from "./quickbar-catalog";
import { QUICKBAR_ROLES } from "./quickbar-catalog";

// Staff quick-bar resolver (server only — reads the dashboard pref).
const FALLBACK: QuickbarId[] = ["pos", "orders"];

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

export function businessType(): string {
  try {
    const t = getPref("business_type", "shop");
    return (BUSINESS_TYPES as readonly string[]).includes(t) ? t : "shop";
  } catch { return "shop"; }
}
