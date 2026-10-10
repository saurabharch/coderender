import { describe, expect, it } from "vitest";
import { hexToTuple, shadeTriplet, BRAND_DEFAULTS, BRAND_KEYS, parseRadius, parseShadow, parseSpace, SHADOW_PRESETS, checkFontUpload, fontFamilyName, fontUrlOk, parseCustomFonts, parseFontMap } from "@/lib/brand";

describe("brand theme math", () => {
  it("builds a 10-step tuple anchored at index 6", () => {
    const t = hexToTuple("#0d9488");
    expect(t).toHaveLength(10);
    expect(t![6]).toBe("#0d9488");
    expect(t![0]).not.toBe(t![9]);
  });

  it("rejects bad hex", () => {
    expect(hexToTuple("teal")).toBe(null);
    expect(hexToTuple("#12345")).toBe(null);
  });

  it("shades triplets for CSS vars", () => {
    expect(shadeTriplet("#0d9488", 0)).toBe("13 148 136");
    expect(shadeTriplet("#0d9488", 1)).toBe("255 255 255");
    expect(shadeTriplet("nope", 0)).toBe(null);
  });

  it("keeps keys in sync with defaults (no drift)", () => {
    for (const k of Object.keys(BRAND_DEFAULTS)) {
      expect(BRAND_KEYS).toContain(k);
    }
  });

  it("ships site identity + icon slots with safe defaults", () => {
    expect(BRAND_DEFAULTS.site_name).toBe("CodeRender");
    expect(BRAND_DEFAULTS.site_description.length).toBeGreaterThan(20);
    expect(BRAND_DEFAULTS.site_keywords).toContain("whatsapp");
    expect(BRAND_DEFAULTS.brand_favicon).toBe("");
    expect(BRAND_DEFAULTS.brand_loading_icon).toBe("");
  });
});

describe("design tokens", () => {
  it("clamps radius and spacing, defaults shadow", () => {
    expect(parseRadius("16")).toBe(16);
    expect(parseRadius(99)).toBe(24);
    expect(parseRadius(-3)).toBe(0);
    expect(parseRadius("nope")).toBe(12);
    expect(parseSpace("4")).toBe(4);
    expect(parseSpace(99)).toBe(16);
    expect(parseSpace(undefined)).toBe(8);
    expect(parseShadow("strong")).toBe("strong");
    expect(parseShadow("blur")).toBe("soft");
    expect(typeof SHADOW_PRESETS.soft).toBe("string");
  });

  it("keeps token keys in sync with defaults", () => {
    for (const k of ["brand_radius", "brand_shadow", "brand_space"]) {
      expect(BRAND_KEYS).toContain(k);
      expect(BRAND_DEFAULTS[k]).toBeDefined();
    }
  });
});

describe("regional font stacks", () => {
  it("registers indic, regional, and arabic stacks", async () => {
    const { FONT_STACKS } = await import("@/lib/brand");
    for (const id of ["indic", "bengali", "tamil", "telugu", "kannada", "gujarati", "arabic"]) {
      const s = FONT_STACKS.find((f) => f.id === id);
      expect(s, id).toBeDefined();
      expect(s!.body).toContain(`--font-${id}`);
    }
  });
});

describe("custom fonts", () => {
  const woff2 = new Uint8Array([0x77, 0x4f, 0x46, 0x32, 0, 0]);
  it("validates by extension, size, and magic", () => {
    expect(checkFontUpload("a.woff2", 1000, woff2)).toEqual({ ok: true });
    expect(checkFontUpload("a.exe", 1000, woff2).ok).toBe(false);
    expect(checkFontUpload("a.ttf", 9 * 1024 * 1024, woff2).ok).toBe(false);
    expect(checkFontUpload("a.ttf", 1000, new Uint8Array([1, 2, 3, 4, 5])).ok).toBe(false);
  });

  it("cleans families, urls, lists, and maps", () => {
    expect(fontFamilyName("  My Font!@#  ")).toBe("My Font");
    expect(fontUrlOk("/uploads/fonts/a.woff2")).toBe(true);
    expect(fontUrlOk("https://x.test/a.woff2")).toBe(true);
    expect(fontUrlOk("javascript:evil")).toBe(false);
    expect(parseCustomFonts([{ family: "X", url: "/uploads/f.woff2", weight: "700" }, { family: "", url: "javascript:z" }]))
      .toEqual([{ family: "X", url: "/uploads/f.woff2", weight: "700" }]);
    expect(parseFontMap({ hi: "indic", xx: "nope" }, ["indic", "tamil", "default"]))
      .toEqual({ hi: "indic" });
    expect(parseFontMap("not json", ["default"])).toEqual({});
  });
});

describe("icon packs", () => {
  it("parses pack ids with classic default", async () => {
    const { parseIconPack, ICON_PACKS } = await import("@/lib/brand");
    expect(ICON_PACKS).toContain("classic");
    expect(ICON_PACKS).toContain("soft");
    expect(parseIconPack("soft")).toBe("soft");
    expect(parseIconPack("nope")).toBe("classic");
  });

  it("keeps soft/classic key parity across all maps", async () => {
    const { packMaps } = await import("@/lib/nav-icons");
    const a = packMaps("classic");
    const b = packMaps("soft");
    for (const k of ["vertical", "nav", "service", "tool"] as const) {
      expect(Object.keys(b[k]).sort()).toEqual(Object.keys(a[k]).sort());
    }
    expect(packMaps("nope").vertical).toBe(a.vertical);
  });
});
