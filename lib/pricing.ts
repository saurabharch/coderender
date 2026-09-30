import { getPref } from "./store";

export interface SitePrices {
  audit: number;
  packFrom: number;
  siteFrom: number;
  retainerFrom: number;
  leadsFrom: number;
  currency: string;
}

const DEFAULTS: SitePrices = {
  audit: 2999, packFrom: 14999, siteFrom: 29999,
  retainerFrom: 11999, leadsFrom: 19999, currency: "₹",
};

export function sitePrices(): SitePrices {
  try {
    const raw = getPref("site_prices", "");
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw);
    return { ...DEFAULTS, ...p };
  } catch {
    return DEFAULTS;
  }
}

export function fmt(n: number): string {
  const p = sitePrices();
  return `${p.currency}${n.toLocaleString("en-IN")}`;
}

export function ladderLine(): string {
  const p = sitePrices();
  const f = (n: number) => `${p.currency}${n.toLocaleString("en-IN")}`;
  return `Audit DRAFT ${f(p.audit)} (credited). Growth packs from DRAFT ${f(p.packFrom)}. Retainers from DRAFT ${f(p.retainerFrom)}/mo. Final quotes always in writing.`;
}
