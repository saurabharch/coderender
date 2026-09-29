import type { MetadataRoute } from "next";
import { VERTICALS } from "@/lib/site";
import { SERVICES } from "@/lib/services";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://coderender.in";
  const staticRoutes = ["", "/about", "/careers", "/pricing", "/contact", "/partner", "/docs",
    "/privacy", "/terms", "/refund",
    "/tools/gbp-booster-whatsapp-ai-agent", "/tools/whatsapp-qr-generator",
    "/tools/whatsapp-template-composer", "/tools/pricing-calculator"];
  return [
    ...staticRoutes.map((r) => ({ url: `${base}${r || "/"}`, lastModified: new Date() })),
    ...VERTICALS.map((v) => ({ url: `${base}/industries/${v.slug}`, lastModified: new Date() })),
    ...SERVICES.map((s) => ({ url: `${base}/services/${s.slug}`, lastModified: new Date() })),
  ];
}
