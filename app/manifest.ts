import type { MetadataRoute } from "next";
import { getPref } from "@/lib/store";

export const dynamic = "force-dynamic";

// PWA manifest wired to the branding kit (uploaded icons + palette + identity).
export default function manifest(): MetadataRoute.Manifest {
  const name = getPref("site_name", "CodeRender");
  const primary = /^#[0-9a-f]{6}$/i.test(getPref("brand_primary", "")) ? getPref("brand_primary", "") : "#0F8F83";
  const icons: MetadataRoute.Manifest["icons"] = [];
  const push = (src: string, sizes: string, purpose?: "maskable" | "any") => {
    if (src) icons.push({ src, sizes, type: "image/png", ...(purpose ? { purpose } : {}) });
  };
  push(getPref("brand_pwa_192", ""), "192x192");
  push(getPref("brand_pwa_512", ""), "512x512");
  push(getPref("brand_pwa_maskable", ""), "512x512", "maskable");
  push(getPref("brand_pwa_apple", ""), "180x180");
  if (icons.length === 0) icons.push({ src: "/icon.svg", sizes: "any", type: "image/svg+xml" });
  return {
    name,
    short_name: name.slice(0, 12),
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: primary,
    icons,
  };
}
