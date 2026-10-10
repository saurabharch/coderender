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
  { id: "indic", label: "Indic Sans — Hindi, Marathi", body: "var(--font-indic), var(--font-body), system-ui, sans-serif", display: "var(--font-indic), var(--font-display), system-ui, sans-serif" },
  { id: "bengali", label: "Bengali — Bangla", body: "var(--font-bengali), var(--font-body), system-ui, sans-serif", display: "var(--font-bengali), var(--font-display), system-ui, sans-serif" },
  { id: "tamil", label: "Tamil", body: "var(--font-tamil), var(--font-body), system-ui, sans-serif", display: "var(--font-tamil), var(--font-display), system-ui, sans-serif" },
  { id: "telugu", label: "Telugu", body: "var(--font-telugu), var(--font-body), system-ui, sans-serif", display: "var(--font-telugu), var(--font-display), system-ui, sans-serif" },
  { id: "kannada", label: "Kannada", body: "var(--font-kannada), var(--font-body), system-ui, sans-serif", display: "var(--font-kannada), var(--font-display), system-ui, sans-serif" },
  { id: "gujarati", label: "Gujarati", body: "var(--font-gujarati), var(--font-body), system-ui, sans-serif", display: "var(--font-gujarati), var(--font-display), system-ui, sans-serif" },
  { id: "arabic", label: "Arabic — Urdu, Arabic", body: "var(--font-arabic), var(--font-body), system-ui, sans-serif", display: "var(--font-arabic), var(--font-display), system-ui, sans-serif" },
  { id: "system", label: "System clean", body: "system-ui, -apple-system, sans-serif", display: "system-ui, -apple-system, sans-serif" },
  { id: "serif", label: "Editorial serif", body: "Georgia, 'Times New Roman', serif", display: "Georgia, 'Times New Roman', serif" },
  { id: "round", label: "Rounded friendly", body: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif", display: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif" },
];

export const BRAND_SCOPES = ["both", "public", "dashboard"] as const;

export const ICON_PACKS = ["classic", "soft"] as const;
export type IconPack = (typeof ICON_PACKS)[number];

/** Icon pack id, defaulting to classic. */
export function parseIconPack(v: unknown): IconPack {
  const s = String(v ?? "");
  return (ICON_PACKS as readonly string[]).includes(s) ? (s as IconPack) : "classic";
}

export const FONT_EXTS = ["woff2", "woff", "ttf", "otf"] as const;
export const FONT_MAX = 5 * 1024 * 1024;

// Font magic numbers: wOF2 / wOFX / OTTO / true / \0\x01\0\0.
function fontMagicOk(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;
  const head = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (head === "wOF2" || head === "wOFX" || head === "OTTO" || head === "true") return true;
  return bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0;
}

export interface FontUploadCheck { ok: boolean; error?: string }

/** Validate an uploaded font before storage (extension + size + magic). */
export function checkFontUpload(name: string, size: number, head: Uint8Array): FontUploadCheck {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (!(FONT_EXTS as readonly string[]).includes(ext)) return { ok: false, error: "woff2, woff, ttf or otf only" };
  if (!(size > 0) || size > FONT_MAX) return { ok: false, error: "font must be 1 byte – 5MB" };
  if (!fontMagicOk(head)) return { ok: false, error: "not a real font file" };
  return { ok: true };
}

/** Canonical family name for @font-face (letters, digits, spaces, dashes). */
export function fontFamilyName(v: unknown): string {
  return String(v ?? "").trim().replace(/[^a-zA-Z0-9 \-]/g, "").replace(/\s+/g, " ").slice(0, 60);
}

/** @font-face URLs may only point at site uploads or https (never code). */
export function fontUrlOk(url: string): boolean {
  const u = String(url || "");
  return u.startsWith("/uploads/") || /^https:\/\/[^\s]+$/i.test(u);
}

export interface CustomFont { family: string; url: string; weight: string }

/** Parse the stored custom-font list, dropping anything malformed. */
export function parseCustomFonts(raw: unknown): CustomFont[] {
  let arr: unknown;
  try { arr = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return []; }
  if (!Array.isArray(arr)) return [];
  const out: CustomFont[] = [];
  for (const x of arr.slice(0, 20)) {
    const o = x as Record<string, unknown>;
    const family = fontFamilyName(o?.family);
    const url = String(o?.url ?? "");
    const weight = ["400", "500", "600", "700"].includes(String(o?.weight)) ? String(o.weight) : "400";
    if (family && fontUrlOk(url)) out.push({ family, url, weight });
  }
  return out;
}

/** Locale → stack map (i18n consumes; unknown locales fall back to default). */
export function parseFontMap(raw: unknown, stackIds: string[]): Record<string, string> {
  let obj: unknown;
  try { obj = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return {}; }
  if (!obj || typeof obj !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const locale = String(k).toLowerCase().replace(/[^a-z-]/g, "").slice(0, 12);
    if (locale && stackIds.includes(String(v))) out[locale] = String(v);
  }
  return Object.fromEntries(Object.entries(out).slice(0, 30));
}

export const SHADOW_PRESETS = {
  none: "none",
  soft: "0 1px 2px rgb(0 0 0 / 0.06), 0 1px 3px rgb(0 0 0 / 0.08)",
  medium: "0 4px 12px rgb(0 0 0 / 0.10), 0 2px 4px rgb(0 0 0 / 0.08)",
  strong: "0 10px 30px rgb(0 0 0 / 0.16), 0 4px 8px rgb(0 0 0 / 0.10)",
} as const;
export type ShadowPreset = keyof typeof SHADOW_PRESETS;

/** Corner radius px, clamped 0–24 (24 keeps pills sane). */
export function parseRadius(v: unknown): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(24, Math.max(0, n)) : 12;
}

/** Shadow preset id, defaulting to soft. */
export function parseShadow(v: unknown): ShadowPreset {
  const s = String(v ?? "");
  return (Object.keys(SHADOW_PRESETS) as ShadowPreset[]).includes(s as ShadowPreset) ? (s as ShadowPreset) : "soft";
}

/** Spacing unit px, clamped 4–16 (8 matches the current rhythm). */
export function parseSpace(v: unknown): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(16, Math.max(4, n)) : 8;
}

// Preference keys (read with getPref in server code; lib/brand stays sqlite-free).
// Single source: every key in BRAND_DEFAULTS must appear here.
export const BRAND_KEYS = [
  "brand_logo_light", "brand_logo_dark", "brand_stamp_light", "brand_stamp_dark",
  "brand_banner_light", "brand_banner_dark",
  "brand_pwa_192", "brand_pwa_512", "brand_pwa_maskable", "brand_pwa_apple",
  "brand_favicon", "brand_loading_icon",
  "brand_logo_opacity", "brand_primary", "brand_deep", "brand_accent", "brand_ink",
  "brand_font", "brand_scope", "brand_radius", "brand_shadow", "brand_space",
  "brand_custom_fonts", "brand_font_map", "brand_icon_pack",
  "site_name", "site_tagline", "site_description", "site_keywords",
] as const;

export const BRAND_DEFAULTS: Record<string, string> = {
  brand_logo_light: "", brand_logo_dark: "", brand_stamp_light: "", brand_stamp_dark: "",
  brand_banner_light: "", brand_banner_dark: "",
  brand_pwa_192: "", brand_pwa_512: "", brand_pwa_maskable: "", brand_pwa_apple: "",
  brand_favicon: "", brand_loading_icon: "",
  brand_logo_opacity: "100", brand_primary: "#0F8F83", brand_deep: "#064E46",
  brand_accent: "#D7F45A", brand_ink: "#171717", brand_font: "default", brand_scope: "both",
  brand_radius: "12", brand_shadow: "soft", brand_space: "8",
  brand_icon_pack: "classic",
  brand_custom_fonts: "[]", brand_font_map: "{}",
  site_name: "CodeRender",
  site_tagline: "WhatsApp Automation, Google Business Profile & Local SEO",
  site_description:
    "CodeRender grows local businesses with WhatsApp Business API automation, Google Business Profile management, local SEO, lead generation, and fast websites. Salons, clinics, gyms, restaurants and more.",
  site_keywords:
    "whatsapp business api, whatsapp automation, google business profile management, local seo india, lead generation services, salon marketing, clinic marketing, restaurant marketing, gym marketing, google maps ranking",
};
