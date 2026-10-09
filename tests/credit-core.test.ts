import { describe, expect, it } from "vitest";
import { ageStatus, allocateSlices, parseTermsDays, udhariReminderText } from "@/lib/credit-core";

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

describe("udhari reminders", () => {
  it("writes exact dues copy", () => {
    expect(udhariReminderText("Saurabh", 50000, 3)).toContain("₹500");
    expect(udhariReminderText("Saurabh", 50000, 3)).toContain("3 day(s)");
    expect(udhariReminderText("", 100, 1)).toContain("friend");
  });
});

describe("installment allocation", () => {
  const slices = [
    { id: 1, dueAt: "2026-10-01", amount: 30000, paid: 0 },
    { id: 2, dueAt: "2026-11-01", amount: 30000, paid: 0 },
  ];
  it("fills oldest first and returns leftover", () => {
    expect(allocateSlices(slices, 40000)).toEqual({
      applied: [{ id: 1, amount: 30000 }, { id: 2, amount: 10000 }],
      leftover: 0,
    });
    expect(allocateSlices(slices, 99999).leftover).toBe(39999);
    expect(allocateSlices(slices, 0)).toEqual({ applied: [], leftover: 0 });
  });

  it("skips settled slices", () => {
    const done = [{ id: 1, dueAt: "2026-10-01", amount: 100, paid: 100 }];
    expect(allocateSlices(done, 50)).toEqual({ applied: [], leftover: 50 });
  });
});
