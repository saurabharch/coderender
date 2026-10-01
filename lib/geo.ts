import geoip from "geoip-lite";

export interface Geo {
  country: string;
  region: string;
  city: string;
  timezone: string;
  ll: [number, number] | null;
}

// MaxMind GeoLite2 via geoip-lite (built-in data; refresh on good bandwidth with
// GEOIP_LICENSE_KEY set: `npm run update:geodb`). Never throws, never blocks.
export function lookup(ip: string | null): Geo | null {
  if (!ip || ip === "anon") return null;
  try {
    const g = geoip.lookup(ip);
    if (!g) return null;
    return {
      country: g.country || "",
      region: g.region || "",
      city: g.city || "",
      timezone: g.timezone || "",
      ll: (g.ll as [number, number]) || null,
    };
  } catch {
    return null;
  }
}

export function geoLabel(g: Geo | null): string {
  if (!g) return "";
  return [g.city, g.region, g.country].filter(Boolean).join(", ");
}
