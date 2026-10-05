import { describe, expect, it } from "vitest";
import { accountBalance, bookValue, formatDocNo, parseDocNo, refundable } from "@/lib/billing-core";

describe("billing-core", () => {
  it("numbers + parses documents", () => {
    expect(formatDocNo("INV", 2026, 7)).toBe("INV-2026-0007");
    expect(parseDocNo("inv-2026-0007")).toEqual({ prefix: "INV", year: 2026, seq: 7 });
    expect(parseDocNo("nope")).toBeNull();
  });

  it("guards refunds", () => {
    expect(refundable(10000, 0, 4000)).toEqual({ ok: true, amount: 4000 });
    expect(refundable(10000, 6000, 5000).ok).toBe(false);
    expect(refundable(10000, 0, 0).ok).toBe(false);
  });

  it("depreciates straight-line", () => {
    expect(bookValue(100000, 10, "2000-01-01")).toBeLessThan(100000);
    expect(bookValue(100000, 0, "2000-01-01")).toBe(100000);
    expect(bookValue(100000, 100, "2000-01-01")).toBe(0);
  });

  it("nets account transactions", () => {
    expect(accountBalance(5000, [{ kind: "in", amount: 2000 }, { kind: "out", amount: 1000 }])).toBe(6000);
  });
});
