// Pure i18n helpers (no sqlite — safe for vitest). Dictionaries are
// versioned JSON under locales/; English is the fallback for every key.
import en from "../locales/en.json";
import hi from "../locales/hi.json";

export const SUPPORTED_LOCALES = ["en", "hi"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

// RTL-capable locales stay flagged off until the pipeline is proven.
export const RTL_LOCALES: string[] = [];

const DICTS: Record<string, Record<string, string>> = { en, hi };

/** Normalize a locale tag to a supported id (unknown → default). */
export function parseLocale(v: unknown, fallback: Locale = "en"): Locale {
  const s = String(v ?? "").toLowerCase().split("-")[0];
  return (SUPPORTED_LOCALES as readonly string[]).includes(s) ? (s as Locale) : fallback;
}

/** Translate with English fallback (missing key renders the key path). */
export function t(locale: string, key: string): string {
  const dict = DICTS[locale] ?? {};
  return dict[key] ?? (DICTS.en[key] ?? key);
}

/** All keys of a locale (parity checks in tests). */
export function localeKeys(locale: string): string[] {
  return Object.keys(DICTS[locale] ?? {});
}

/** Text direction: rtl only for flagged-on RTL locales. */
export function dirFor(locale: string, rtlOn: boolean): "ltr" | "rtl" {
  return rtlOn && RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
}

/** Location hint: India suggests Hindi, everywhere else English. */
export function hintForCountry(country: string): Locale {
  return country.trim().toUpperCase() === "IN" ? "hi" : "en";
}
