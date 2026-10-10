import { describe, expect, it } from "vitest";
import { normBadge, normOfferMode, planEffective } from "@/lib/catalog-core";

describe("plan effective price", () => {
  it("charges list price with no offer and no strike", () => {
    expect(planEffective({ price: 4999 })).toEqual({ charge: 4999, struck: 0, pctOff: 0, onOffer: false });
  });
  it("applies flat offers floored at zero", () => {
    expect(planEffective({ price: 4999, offerMode: "flat", offerValue: 1000 }).charge).toBe(3999);
    expect(planEffective({ price: 500, offerMode: "flat", offerValue: 9999 }).charge).toBe(0);
  });
  it("applies pct offers clamped 0..100", () => {
    expect(planEffective({ price: 10000, offerMode: "pct", offerValue: 25 }).charge).toBe(7500);
    expect(planEffective({ price: 10000, offerMode: "pct", offerValue: 150 }).charge).toBe(0);
    expect(planEffective({ price: 10000, offerMode: "pct", offerValue: -5 }).charge).toBe(10000);
  });
  it("strikes mrp only when honestly above the charge", () => {
    const r = planEffective({ price: 4999, mrp: 7999 });
    expect(r.struck).toBe(7999);
    expect(r.onOffer).toBe(true);
    expect(r.pctOff).toBe(38);
    expect(planEffective({ price: 4999, mrp: 4999 }).struck).toBe(0);
    expect(planEffective({ price: 4999, mrp: 100 }).struck).toBe(0);
  });
  it("ignores unknown modes and badges safely", () => {
    expect(normOfferMode("bogus")).toBe("off");
    expect(normBadge("bogus")).toBe("none");
    expect(normBadge("new-price")).toBe("new-price");
    expect(planEffective({ price: -50 }).charge).toBe(0);
  });
});
