// Brand theming math (pure — safe for vitest). Hex primary → Mantine tuple.
function hexRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/** 10-step tuple from white → primary → near-black (MantineColorsTuple shape). */
export function hexToTuple(hex: string): string[] | null {
  const rgb = hexRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb;
  const out: string[] = [];
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    // First half blends toward white, second half toward deep slate-black.
    const base = t < 0.5 ? [255, 255, 255] : [4, 20, 20];
    const k = t < 0.5 ? 1 - t * 2 * 0.85 : (t - 0.5) * 2;
    const c = (v: number, w: number) => Math.max(0, Math.min(255, t < 0.5 ? mix(v, w, 1 - k) : mix(v, w, k)));
    out.push(`#${((1 << 24) + (c(r, base[0]) << 16) + (c(g, base[1]) << 8) + c(b, base[2])).toString(16).slice(1)}`);
  }
  out[6] = `#${hex.trim().replace("#", "").toLowerCase()}`;
  return out;
}

export const STANDARD_PALETTES = [
  { name: "CodeRender", primary: "#0F8F83", deep: "#064E46", accent: "#D7F45A", ink: "#171717" },
  { name: "Teal", primary: "#0d9488", deep: "#0f766e", accent: "#D7F45A", ink: "#171717" },
  { name: "Ocean", primary: "#0f71fa", deep: "#05497f", accent: "#ebf373", ink: "#171717" },
  { name: "Forest", primary: "#1f7559", deep: "#545c2c", accent: "#d4ec8c", ink: "#171717" },
  { name: "Plum", primary: "#7c3aed", deep: "#4c1d95", accent: "#f0abfc", ink: "#171717" },
  { name: "Ember", primary: "#f55d2b", deep: "#7c2d12", accent: "#fde68a", ink: "#171717" },
  { name: "Rose", primary: "#e11d48", deep: "#881337", accent: "#fecdd3", ink: "#171717" },
  { name: "Amber", primary: "#b45309", deep: "#78350f", accent: "#fde68a", ink: "#171717" },
  { name: "Slate", primary: "#334155", deep: "#0f172a", accent: "#e2e8f0", ink: "#171717" },
];

/** Mix hex toward white (t>0) or black (t<0); returns "R G B" triplet for CSS vars. */
export function shadeTriplet(hex: string, t: number): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const base = t >= 0 ? 255 : 0;
  const k = Math.min(1, Math.abs(t));
  const mix = (v: number) => Math.round(v + (base - v) * k);
  return `${mix((n >> 16) & 255)} ${mix((n >> 8) & 255)} ${mix(n & 255)}`;
}

export const FONT_STACKS = [  { id: "default", label: "Default (site fonts)", body: "var(--font-body), system-ui, sans-serif", display: "var(--font-display), system-ui, sans-serif" },
  { id: "system", label: "System clean", body: "system-ui, -apple-system, sans-serif", display: "system-ui, -apple-system, sans-serif" },
  { id: "serif", label: "Editorial serif", body: "Georgia, 'Times New Roman', serif", display: "Georgia, 'Times New Roman', serif" },
  { id: "round", label: "Rounded friendly", body: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif", display: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif" },
];

export const BRAND_SCOPES = ["both", "public", "dashboard"] as const;

// Preference keys (read with getPref in server code; lib/brand stays sqlite-free).
export const BRAND_KEYS = [
  "brand_logo_light", "brand_logo_dark", "brand_stamp_light", "brand_stamp_dark",
  "brand_banner_light", "brand_banner_dark",
  "brand_pwa_192", "brand_pwa_512", "brand_pwa_maskable", "brand_pwa_apple",
  "brand_logo_opacity", "brand_primary", "brand_font", "brand_scope",
] as const;

export const BRAND_DEFAULTS: Record<string, string> = {
  brand_logo_light: "", brand_logo_dark: "", brand_stamp_light: "", brand_stamp_dark: "",
  brand_banner_light: "", brand_banner_dark: "",
  brand_pwa_192: "", brand_pwa_512: "", brand_pwa_maskable: "", brand_pwa_apple: "",
  brand_logo_opacity: "100", brand_primary: "#0F8F83", brand_deep: "#064E46",
  brand_accent: "#D7F45A", brand_ink: "#171717", brand_font: "default", brand_scope: "both",
};
