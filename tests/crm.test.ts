import { describe, expect, it } from "vitest";
import { clv, earnPoints, redeemValue, segmentOf, stageCan, tierFor } from "@/lib/crm-core";

describe("crm-core", () => {
  it("gates pipeline moves", () => {
    expect(stageCan("lead", "prospect")).toBe(true);
    expect(stageCan("lead", "customer")).toBe(false);
    expect(stageCan("negotiation", "customer")).toBe(true);
    expect(stageCan("customer", "repeat")).toBe(true);
    expect(stageCan("repeat", "customer")).toBe(true); // one step back allowed
    expect(stageCan("loyal", "lead")).toBe(true); // lost customer restarts pipeline
  });

  it("segments by recency + spend", () => {
    expect(segmentOf([])).toBe("new");
    const now = Date.now();
    const day = 86400_000;
    const recent = [{ grand: 5000, at: new Date(now - day).toISOString() }];
    expect(segmentOf(recent, now)).toBe("active");
    expect(segmentOf([{ grand: 20000000, at: new Date(now - day).toISOString() }], now)).toBe("vip");
    expect(segmentOf([{ grand: 5000, at: new Date(now - 100 * day).toISOString() }], now)).toBe("dormant");
    expect(segmentOf([{ grand: 5000, at: new Date(now - 200 * day).toISOString() }], now)).toBe("lost");
  });

  it("values lifetime + loyalty", () => {
    expect(clv([{ grand: 1000 }, { grand: 2500 }])).toBe(3500);
    expect(earnPoints(100000)).toBe(10); // ₹1000 spend → 10 pts at 1/₹100
    expect(redeemValue(100)).toBe(2500);
    expect(tierFor(0)).toBe("silver");
    expect(tierFor(600)).toBe("gold");
    expect(tierFor(5000)).toBe("platinum");
  });
});
