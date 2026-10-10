"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Logo } from "@/components/logo";

// Brand logo with theme + opacity from the dashboard kit. Falls back to the
// built-in mark until the kit loads (or when no custom logo is set).
export function BrandLogo({ size = 28, wordmark = "full" }: { size?: number; wordmark?: "full" | "desktop" }) {
  const { resolvedTheme } = useTheme();
  const [kit, setKit] = useState<{ logo: string; opacity: number } | null>(null);
  useEffect(() => {
    fetch("/api/brand").then((r) => r.json()).then((d) => {
      if ((d.brand_scope || "both") === "dashboard") return;
      const url = resolvedTheme === "dark" ? d.brand_logo_dark || d.brand_logo_light : d.brand_logo_light;
      if (url) setKit({ logo: url, opacity: Math.min(100, Math.max(10, Number(d.brand_logo_opacity) || 100)) });
    }).catch(() => {});
  }, [resolvedTheme]);
  if (!kit) return <Logo size={size} wordmark={wordmark} />;
  return (
    <span className="inline-flex items-center gap-2" aria-label="home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={kit.logo} alt="" style={{ opacity: kit.opacity / 100, height: size, width: "auto" }} />
      <span className={`text-lg font-extrabold tracking-tight ${wordmark === "desktop" ? "hidden lg:inline" : ""}`}>coderender</span>
    </span>
  );
}

// Applies palette + type from the kit via CSS vars + font stacks. Scoped by
// the dashboard setting: public routes, dashboard routes, or both.
export function BrandTheme({ admin = false }: { admin?: boolean }) {
  useEffect(() => {
    fetch("/api/brand").then((r) => r.json()).then((d) => {
      const scope = d.brand_scope || "both";
      if (admin && scope === "public") return;
      if (!admin && scope === "dashboard") return;
      const root = document.documentElement;
      const hexOk = (h: unknown): h is string => typeof h === "string" && /^#[0-9a-f]{6}$/i.test(h);
      const triple = (hex: string): string => {
        const n = parseInt(hex.slice(1), 16);
        return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
      };
      if (hexOk(d.brand_primary)) root.style.setProperty("--brand", triple(d.brand_primary));
      if (hexOk(d.brand_deep)) root.style.setProperty("--brand-deep", triple(d.brand_deep));
      else if (hexOk(d.brand_primary)) {
        const n = parseInt((d.brand_primary as string).slice(1), 16);
        const dark = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => Math.round(v * 0.45)).join(" ");
        root.style.setProperty("--brand-deep", dark);
      }
      if (hexOk(d.brand_primary)) {
        const n = parseInt((d.brand_primary as string).slice(1), 16);
        const rgb: [number, number, number] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        const mix = (t: number) => rgb.map((v) => Math.round(v + ((t >= 0 ? 255 : 0) - v) * Math.min(1, Math.abs(t)))).join(" ");
        root.style.setProperty("--brand-soft", mix(0.85));
      }
      if (hexOk(d.brand_accent)) root.style.setProperty("--brand-accent", triple(d.brand_accent));
      if (hexOk(d.brand_ink)) root.style.setProperty("--brand-ink", triple(d.brand_ink));
      const numOk = (v: unknown, lo: number, hi: number): number | null => {
        const n = Math.round(Number(v));
        return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null;
      };
      const radius = numOk(d.brand_radius, 0, 24);
      if (radius !== null) root.style.setProperty("--brand-radius", `${radius}px`);
      const shadows: Record<string, string> = {
        none: "none",
        soft: "0 1px 2px rgb(0 0 0 / 0.06), 0 1px 3px rgb(0 0 0 / 0.08)",
        medium: "0 4px 12px rgb(0 0 0 / 0.10), 0 2px 4px rgb(0 0 0 / 0.08)",
        strong: "0 10px 30px rgb(0 0 0 / 0.16), 0 4px 8px rgb(0 0 0 / 0.10)",
      };
      if (typeof d.brand_shadow === "string" && shadows[d.brand_shadow]) {
        root.style.setProperty("--brand-shadow", shadows[d.brand_shadow]);
      }
      const space = numOk(d.brand_space, 4, 16);
      if (space !== null) root.style.setProperty("--brand-space", `${space}px`);
      const fonts: Record<string, { body: string; display: string }> = {
        default: { body: "var(--font-body), system-ui, sans-serif", display: "var(--font-display), system-ui, sans-serif" },
        indic: { body: "var(--font-indic), var(--font-body), system-ui, sans-serif", display: "var(--font-indic), var(--font-display), system-ui, sans-serif" },
        bengali: { body: "var(--font-bengali), var(--font-body), system-ui, sans-serif", display: "var(--font-bengali), var(--font-display), system-ui, sans-serif" },
        tamil: { body: "var(--font-tamil), var(--font-body), system-ui, sans-serif", display: "var(--font-tamil), var(--font-display), system-ui, sans-serif" },
        telugu: { body: "var(--font-telugu), var(--font-body), system-ui, sans-serif", display: "var(--font-telugu), var(--font-display), system-ui, sans-serif" },
        kannada: { body: "var(--font-kannada), var(--font-body), system-ui, sans-serif", display: "var(--font-kannada), var(--font-display), system-ui, sans-serif" },
        gujarati: { body: "var(--font-gujarati), var(--font-body), system-ui, sans-serif", display: "var(--font-gujarati), var(--font-display), system-ui, sans-serif" },
        arabic: { body: "var(--font-arabic), var(--font-body), system-ui, sans-serif", display: "var(--font-arabic), var(--font-display), system-ui, sans-serif" },
        system: { body: "system-ui, -apple-system, sans-serif", display: "system-ui, -apple-system, sans-serif" },
        serif: { body: "Georgia, 'Times New Roman', serif", display: "Georgia, 'Times New Roman', serif" },
        round: { body: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif", display: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif" },
      };
      const f = fonts[d.brand_font] ?? fonts.default;
      root.style.setProperty("--brand-body-override", f.body);
      root.style.setProperty("--brand-display-override", f.display);
      document.body.style.fontFamily = f.body;
    }).catch(() => {});
  }, [admin]);
  return null;
}
