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
      if (/^#[0-9a-f]{6}$/i.test(d.brand_primary || "")) {
        const hex = d.brand_primary as string;
        const m = /^#([0-9a-f]{6})$/i.exec(hex)!;
        const n = parseInt(m[1], 16);
        const rgb: [number, number, number] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        const mix = (t: number) => rgb.map((v) => Math.round(v + ((t >= 0 ? 255 : 0) - v) * Math.min(1, Math.abs(t)))).join(" ");
        root.style.setProperty("--brand", mix(0));
        root.style.setProperty("--brand-soft", mix(0.85));
        root.style.setProperty("--brand-deep", mix(-0.45));
      }
      const fonts: Record<string, { body: string; display: string }> = {
        default: { body: "var(--font-body), system-ui, sans-serif", display: "var(--font-display), system-ui, sans-serif" },
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
