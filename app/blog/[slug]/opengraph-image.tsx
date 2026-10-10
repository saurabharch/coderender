import { ImageResponse } from "next/og";
import { getDb, getPref } from "@/lib/store";
import { BRAND_DEFAULTS } from "@/lib/brand";
import { plainExcerpt } from "@/lib/body-html";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Per-post OG card: title + excerpt + site name, all live data.
export default async function PostOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pick = (k: string): string => {
    try { return getPref(k, BRAND_DEFAULTS[k] ?? ""); } catch { return BRAND_DEFAULTS[k] ?? ""; }
  };
  let title = "Blog";
  let excerpt = "";
  try {
    const p = getDb().prepare("SELECT title, excerpt, body FROM Post WHERE slug=? AND published=1").get(slug) as
      { title: string; excerpt: string; body: string } | undefined;
    if (p) {
      title = p.title;
      excerpt = p.excerpt || plainExcerpt(p.body, 140);
    }
  } catch { /* defaults */ }
  const name = pick("site_name") || "CodeRender";
  const deep = /^#[0-9a-f]{6}$/i.test(pick("brand_deep")) ? pick("brand_deep") : "#064E46";
  const accent = /^#[0-9a-f]{6}$/i.test(pick("brand_accent")) ? pick("brand_accent") : "#D7F45A";
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", background: deep, color: "#fff", padding: 80 }}>
        <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: accent }}>{name} · Blog</div>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 800, marginTop: 16 }}>{title.slice(0, 90)}</div>
        {excerpt ? <div style={{ display: "flex", fontSize: 26, opacity: 0.85, marginTop: 16 }}>{excerpt.slice(0, 140)}</div> : null}
      </div>
    ),
    { ...size },
  );
}
