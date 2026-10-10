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
export function LocaleProvider({ initial, rtlOn, hint, hasCookie, children }: {
  initial: Locale; rtlOn: boolean; hint: string | null; hasCookie: boolean;
  children: React.ReactNode;
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
  const [hintShot, setHintShot] = useState(true);
  useEffect(() => {
    // One-time suggestion pill, per page load, dismissible for the session.
    try {
      if (sessionStorage.getItem("cr_hint_done") === "1") setHintShot(false);
    } catch { /* ignore */ }
  }, []);
  const showHint = !hasCookie && hintShot && hint !== null && parseLocale(hint, "en") !== locale;
  const takeHint = () => {
    if (hint) setLocale(parseLocale(hint, "en"));
    try { sessionStorage.setItem("cr_hint_done", "1"); } catch { /* ignore */ }
    setHintShot(false);
  };
  const dropHint = () => {
    try { sessionStorage.setItem("cr_hint_done", "1"); } catch { /* ignore */ }
    setHintShot(false);
  };
  return (
    <Ctx.Provider value={{ locale, tr: (k) => t(locale, k), setLocale }}>
      {children}
      {showHint && hint && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0" role="dialog" aria-label="Language suggestion">
          <div className="flex min-h-[44px] items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-semibold shadow-xl dark:border-white/20 dark:bg-zinc-900">
            <span>{hint === "hi" ? "हिंदी में देखें?" : `View in ${hint}?`}</span>
            <button onClick={takeHint} className="min-h-[36px] rounded-full bg-brand px-3 text-xs font-bold text-white">Yes</button>
            <button onClick={dropHint} aria-label="Dismiss" className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full border border-black/15 dark:border-white/20">✕</button>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
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
