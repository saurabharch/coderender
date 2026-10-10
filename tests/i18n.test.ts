import { describe, expect, it } from "vitest";
import { dirFor, hintForCountry, localeKeys, parseLocale, t } from "@/lib/i18n";

describe("i18n", () => {
  it("normalizes locales with english fallback", () => {
    expect(parseLocale("hi")).toBe("hi");
    expect(parseLocale("hi-IN")).toBe("hi");
    expect(parseLocale("fr")).toBe("en");
    expect(parseLocale(null)).toBe("en");
  });

  it("translates with english fallback", () => {
    expect(t("hi", "nav.pricing")).toBe("मूल्य");
    expect(t("xx", "nav.pricing")).toBe("Pricing");
    expect(t("hi", "missing.key")).toBe("missing.key");
  });

  it("keeps dictionary parity", () => {
    expect(localeKeys("hi").sort()).toEqual(localeKeys("en").sort());
  });

  it("gates rtl and hints from country", () => {
    expect(dirFor("hi", false)).toBe("ltr");
    expect(dirFor("ar", true)).toBe("ltr");
    expect(hintForCountry("IN")).toBe("hi");
    expect(hintForCountry("US")).toBe("en");
  });
});
