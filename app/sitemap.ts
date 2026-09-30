import type { MetadataRoute } from "next";
import { VERTICALS } from "@/lib/site";
import { SERVICES } from "@/lib/services";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://coderender.in";
  const now = new Date();
  const top = ["", "/pricing", "/contact", "/tools/gbp-booster-whatsapp-ai-agent"];
  const mid = ["/about", "/careers", "/partner", "/docs", "/privacy", "/terms", "/refund",
    "/tools/whatsapp-qr-generator", "/tools/whatsapp-template-composer", "/tools/pricing-calculator"];
  return [
    ...top.map((r) => ({ url: `${base}${r || "/"}`, lastModified: now, changeFrequency: "weekly" as const, priority: 1 })),
    ...mid.map((r) => ({ url: `${base}${r}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...VERTICALS.map((v) => ({ url: `${base}/industries/${v.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...SERVICES.map((s) => ({ url: `${base}/services/${s.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
