import { describe, expect, it } from "vitest";
import { isLayerType, parseItems, resolveVars, sanitizeProps } from "@/lib/uibuilder";

describe("uibuilder", () => {
  it("accepts registry types only", () => {
    expect(isLayerType("hero")).toBe(true);
    expect(isLayerType("cards")).toBe(true);
    expect(isLayerType("marquee")).toBe(false);
  });

  it("parses item lines (link vs value vs plain)", () => {
    expect(parseItems("Docs | /docs\nFast | 2s loads\nPlain")).toEqual([
      { label: "Docs", href: "/docs" },
      { label: "Fast", value: "2s loads" },
      { label: "Plain" },
    ]);
  });

  it("sanitizes props per type (drops bad urls)", () => {
    expect(sanitizeProps("image", { image: "javascript:x" })).toEqual({});
    expect(sanitizeProps("image", { image: "/uploads/a.png", title: "A" })).toEqual({ title: "A", image: "/uploads/a.png" });
    expect(sanitizeProps("cta", { link: "/contact" })).toEqual({ link: "/contact" });
  });

  it("resolves site + page vars, leaves unknown", () => {
    expect(resolveVars("Hi {{siteName}} {{year}} {{nope}}", { siteName: "X" })).toBe(
      `Hi X ${new Date().getFullYear()} {{nope}}`);
  });
});
