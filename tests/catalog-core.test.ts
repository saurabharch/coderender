import { describe, expect, it } from "vitest";
import { normBadge, normOfferMode, offerStatus, planEffective } from "@/lib/catalog-core";

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

  it("gates offers by schedule window", () => {
    const live = { price: 10000, offerMode: "pct", offerValue: 20 };
    // Unbounded (blank) = always live.
    expect(planEffective(live).charge).toBe(8000);
    // Upcoming: future start behaves like no offer.
    const up = planEffective({ ...live, startsAt: "2099-01-01T00:00:00Z" });
    expect(up).toEqual({ charge: 10000, struck: 0, pctOff: 0, onOffer: false });
    // Expired: past end behaves like no offer.
    const ex = planEffective({ ...live, startsAt: "2020-01-01T00:00:00Z", endsAt: "2020-02-01T00:00:00Z" });
    expect(ex.onOffer).toBe(false);
    expect(ex.charge).toBe(10000);
    // Live window applies.
    const now = Date.now();
    const win = planEffective({
      ...live, startsAt: new Date(now - 86400000).toISOString(),
      endsAt: new Date(now + 86400000).toISOString(), now,
    });
    expect(win.charge).toBe(8000);
    // Invalid dates fail open (offer stays live).
    expect(planEffective({ ...live, startsAt: "not-a-date" }).charge).toBe(8000);
  });

  it("reports offer status for the admin chip", () => {
    expect(offerStatus({ offerMode: "off" })).toBe("off");
    expect(offerStatus({ offerMode: "pct", offerValue: 0 })).toBe("off");
    expect(offerStatus({ offerMode: "pct", offerValue: 10 })).toBe("live");
    expect(offerStatus({ offerMode: "pct", offerValue: 10, startsAt: "2099-01-01T00:00:00Z" })).toBe("upcoming");
    expect(offerStatus({ offerMode: "pct", offerValue: 10, endsAt: "2020-01-01T00:00:00Z" })).toBe("expired");
  });
});
