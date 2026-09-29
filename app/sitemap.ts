import type { MetadataRoute } from "next";
import { VERTICALS } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://coderender.in";
  const staticRoutes = ["", "/about", "/careers", "/pricing", "/contact", "/tools/gbp-booster-whatsapp-ai-agent"];
  return [
    ...staticRoutes.map((r) => ({ url: `${base}${r || "/"}`, lastModified: new Date() })),
    ...VERTICALS.map((v) => ({ url: `${base}/industries/${v.slug}`, lastModified: new Date() })),
  ];
}
