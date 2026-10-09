import { describe, expect, it } from "vitest";
import { parseLabelTemplate, templateName } from "@/lib/label-template";

describe("label templates", () => {
  it("accepts a full valid payload", () => {
    const t = parseLabelTemplate({
      paper: "a4", orient: "landscape", stW: 38, stH: 21, mode: "qr",
      show: { name: true, sku: true },
    });
    expect(t?.paper).toBe("a4");
    expect(t?.orient).toBe("landscape");
    expect(t?.show.sku).toBe(true);
    expect(t?.show.price).toBe(true);
  });

  it("drops unknown keys and clamps ranges", () => {
    const t = parseLabelTemplate({ paper: "napkin", stW: 9999, mode: "fax", evil: "x", show: null });
    expect(t?.paper).toBe("roll80");
    expect(t?.stW).toBe(200);
    expect(t?.mode).toBe("both");
    expect(t).not.toHaveProperty("evil");
  });

  it("rejects shapeless payloads and trims names", () => {
    expect(parseLabelTemplate(null)).toBe(null);
    expect(parseLabelTemplate("a4")).toBe(null);
    expect(templateName("  Shelf  ")).toBe("Shelf");
    expect(templateName("x".repeat(99))).toHaveLength(60);
  });
});
