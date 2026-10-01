import { lookup, geoLabel } from "./geo";

// Adapted from rollout's request-ip.js: Cloudflare first (we sit behind a
// tunnel), then true-client-ip / x-real-ip, then first valid x-forwarded-for.
function isIp(s: string): boolean {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(s) || /^[0-9a-f:]+$/i.test(s);
}

export function getClientIp(req: Request): string | null {
  const h = (k: string) => req.headers.get(k) || "";
  for (const v of [h("cf-connecting-ip"), h("true-client-ip"), h("x-real-ip")]) {
    if (v && isIp(v)) return v;
  }
  const xff = h("x-forwarded-for");
  if (xff) {
    for (const part of xff.split(",")) {
      let ip = part.trim();
      if (ip.includes(":")) {
        const segs = ip.split(":");
        if (segs.length === 2) ip = segs[0];
        else continue;
      }
      if (ip && ip.toLowerCase() !== "unknown" && isIp(ip)) return ip;
    }
  }
  return null;
}

export interface ClientInfo {
  ip: string | null;
  geo: string;
  language: string;
  mobile: boolean;
  botUA: boolean;
}

export function clientInfo(req: Request): ClientInfo {
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") || "";
  return {
    ip,
    geo: geoLabel(lookup(ip)),
    language: (req.headers.get("accept-language") || "").slice(0, 60),
    mobile: /mobile|android|iphone|ipad/i.test(ua),
    botUA: /headless|phantom|selenium|playwright|puppeteer|bot|crawl|spider/i.test(ua),
  };
}
