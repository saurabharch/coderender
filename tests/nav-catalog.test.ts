import { describe, expect, it } from "vitest";
import { NAV_GROUPS, allNavHrefs, applyModeVisible } from "@/lib/nav-catalog";

describe("nav catalog", () => {
  it("has unique hrefs under six groups", () => {
    expect(NAV_GROUPS.map((g) => g.label)).toEqual(
      ["Workspace", "Sell", "Engage", "Plan", "Team", "System"],
    );
    const hrefs = allNavHrefs();
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toContain("/admin/pos");
    expect(hrefs).toContain("/admin/settings");
  });

  it("treats missing mode list as full dashboard", () => {
    expect(applyModeVisible(["/admin/pos"], {}, "offline")).toEqual(["/admin/pos"]);
    expect(applyModeVisible(null, {}, "online")).toBe(null);
  });

  it("intersects industry and mode lists, drops unknown hrefs", () => {
    const out = applyModeVisible(
      ["/admin/pos", "/admin/orders", "/admin/nope"],
      { offline: ["/admin/pos", "/admin/ghost"] },
      "offline",
    );
    expect(out).toEqual(["/admin/pos"]);
  });

  it("full mode list means no restriction", () => {
    const all = allNavHrefs();
    expect(applyModeVisible(["/admin/pos"], { hybrid: all }, "hybrid")).toEqual(["/admin/pos"]);
  });
});
