import { ImageResponse } from "next/og";
import { getPref } from "@/lib/store";
import { BRAND_DEFAULTS } from "@/lib/brand";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Home OG card: brand colors + name + tagline, all live prefs.
export default async function OgImage() {
  const pick = (k: string): string => {
    try { return getPref(k, BRAND_DEFAULTS[k] ?? ""); } catch { return BRAND_DEFAULTS[k] ?? ""; }
  };
  const name = pick("site_name") || "CodeRender";
  const tagline = pick("site_tagline") || "";
  const primary = /^#[0-9a-f]{6}$/i.test(pick("brand_primary")) ? pick("brand_primary") : "#0F8F83";
  const deep = /^#[0-9a-f]{6}$/i.test(pick("brand_deep")) ? pick("brand_deep") : "#064E46";
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", background: deep, color: "#fff", padding: 80 }}>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800 }}>{name}</div>
        {tagline ? <div style={{ display: "flex", fontSize: 30, opacity: 0.85, marginTop: 16 }}>{tagline.slice(0, 120)}</div> : null}
        <div style={{ display: "flex", marginTop: 32 }}>
          <div style={{ display: "flex", background: primary, borderRadius: 999, padding: "12px 32px", fontSize: 24, fontWeight: 700 }}>Get started</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
