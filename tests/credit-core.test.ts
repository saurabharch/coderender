import { describe, expect, it } from "vitest";
import { ageStatus, parseTermsDays } from "@/lib/credit-core";

const DAY = 86400000;

describe("credit-core", () => {
  it("ages a balance against terms", () => {
    const since = new Date(Date.now() - 10 * DAY).toISOString();
    expect(ageStatus({ balance: 5000, balanceSince: since, termsDays: 7 }))
      .toEqual({ days: 10, overdue: true, label: "overdue 3d" });
    expect(ageStatus({ balance: 5000, balanceSince: since, termsDays: 30 }).overdue).toBe(false);
  });

  it("treats missing age as fresh and settled as settled", () => {
    expect(ageStatus({ balance: 5000, balanceSince: "", termsDays: 0 }))
      .toEqual({ days: 0, overdue: false, label: "due" });
    expect(ageStatus({ balance: 0, balanceSince: "", termsDays: 7 }).label).toBe("settled");
  });

  it("clamps terms", () => {
    expect(parseTermsDays(30)).toBe(30);
    expect(parseTermsDays(-5)).toBe(0);
    expect(parseTermsDays(999)).toBe(365);
    expect(parseTermsDays("nope")).toBe(0);
  });
});
