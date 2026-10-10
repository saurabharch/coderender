"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { dirFor, parseLocale, t, type Locale } from "@/lib/i18n";

const Ctx = createContext<{ locale: Locale; tr: (key: string) => string; setLocale: (l: Locale) => void }>({
  locale: "en",
  tr: (k) => t("en", k),
  setLocale: () => {},
});

export const useLocale = () => useContext(Ctx);

// Locale provider: remembered cookie wins, else the server-provided hint
// (location-based), else English. Switcher persists + flips <html> dir.
export function LocaleProvider({ initial, rtlOn, children }: {
  initial: Locale; rtlOn: boolean; children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initial);
  useEffect(() => {
    try {
      const m = document.cookie.match(/(?:^|; )cr_locale=([a-z-]+)/);
      if (m) setLocaleState(parseLocale(m[1], initial));
    } catch { /* ignore */ }
  }, [initial]);
  useEffect(() => {
    try {
      document.documentElement.lang = locale;
      document.documentElement.dir = dirFor(locale, rtlOn);
    } catch { /* ignore */ }
  }, [locale, rtlOn]);
  const setLocale = (l: Locale) => {
    const clean = parseLocale(l, "en");
    try {
      document.cookie = `cr_locale=${clean}; Path=/; Max-Age=${365 * 86400}; SameSite=Lax`;
    } catch { /* ignore */ }
    setLocaleState(clean);
  };
  return <Ctx.Provider value={{ locale, tr: (k) => t(locale, k), setLocale }}>{children}</Ctx.Provider>;
}

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();
  return (
    <span className="flex items-center gap-1" role="group" aria-label="Language">
      {(["en", "hi"] as const).map((l) => (
        <button key={l} onClick={() => setLocale(l)} aria-pressed={locale === l}
          className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-2 text-xs font-bold ${locale === l ? "bg-brand text-white" : "border border-black/15 dark:border-white/20"}`}>
          {l === "en" ? "EN" : "हिं"}
        </button>
      ))}
    </span>
  );
}
