import { describe, expect, it } from "vitest";
import { activeDays, coverDays, dailyVelocity, historyClass, suggestQty } from "@/lib/forecast-core";

const sales = [
  { day: "2026-10-01", qty: 2 }, { day: "2026-10-02", qty: 0 },
  { day: "2026-10-03", qty: 4 },
];

describe("forecast-core", () => {
  it("hand-computed velocity and cover", () => {
    // 6 units over a 3-day window = 2/day; 10 in stock = 5 days cover.
    expect(dailyVelocity(sales, 3)).toBe(2);
    expect(coverDays(10, 2)).toBe(5);
    expect(coverDays(10, 0)).toBe(null);
  });

  it("tops up to target plus safety, never negative", () => {
    // 2/day × (21 + 7) = 56 wanted − 10 on hand = 46 to order.
    expect(suggestQty(10, 2, 21, 7)).toBe(46);
    expect(suggestQty(100, 2, 21, 7)).toBe(0);
    expect(suggestQty(10, 0)).toBe(0);
  });

  it("classes history honestly", () => {
    expect(activeDays(sales)).toBe(2);
    expect(historyClass(sales)).toBe("thin");
    expect(historyClass([])).toBe("none");
    const week = Array.from({ length: 7 }, (_, i) => ({ day: `2026-10-0${i + 1}`, qty: 1 }));
    expect(historyClass(week)).toBe("ok");
  });
});
