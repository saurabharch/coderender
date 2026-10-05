import { describe, expect, it } from "vitest";
import { attendanceSummary, forecastNext, loanCut, marginPct, netPay } from "@/lib/people-core";

describe("people-core", () => {
  it("nets pay with a zero floor", () => {
    expect(netPay({ base: 3000000, allowances: 200000, deductions: 100000, loanCut: 50000 })).toBe(3050000);
    expect(netPay({ base: 1000, allowances: 0, deductions: 5000, loanCut: 0 })).toBe(0);
  });

  it("slices loans fairly", () => {
    expect(loanCut(10000, 3000)).toBe(3000);
    expect(loanCut(2000, 3000)).toBe(2000);
  });

  it("summarizes attendance", () => {
    const s = attendanceSummary(["present", "present", "half", "absent", "leave"]);
    expect(s.present).toBe(2.5);
    expect(s.absent).toBe(1);
    expect(s.leave).toBe(1);
    expect(s.rate).toBe(56);
  });

  it("forecasts + margins honestly", () => {
    expect(forecastNext([100, 200, 300])).toBe(200);
    expect(forecastNext([])).toBe(0);
    expect(marginPct(10000, 6000)).toBe(40);
    expect(marginPct(10000, 12000)).toBe(-20);
    expect(marginPct(0, 5)).toBe(0);
  });
});
