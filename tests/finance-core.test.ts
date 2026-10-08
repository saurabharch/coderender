import { describe, expect, it } from "vitest";
import { booksBalance, legsFor, sumTrial } from "@/lib/finance-core";

describe("finance-core", () => {
  it("maps every event kind to balanced legs", () => {
    expect(legsFor("invoice")).toEqual(["receivable", "revenue"]);
    expect(legsFor("payment")).toEqual(["cash", "receivable"]);
    expect(legsFor("payout")).toEqual(["partner-payable", "cash"]);
    expect(legsFor("refund")).toEqual(["revenue", "cash"]);
    expect(legsFor("mystery")).toEqual(["suspense", "suspense"]);
  });

  it("nets rows into a balanced trial balance", () => {
    const tb = sumTrial([
      { debit: "receivable", credit: "revenue", amount: 10000 },
      { debit: "cash", credit: "receivable", amount: 10000 },
    ]);
    expect(tb.find((r) => r.account === "receivable")).toEqual({ account: "receivable", debit: 10000, credit: 10000 });
    expect(booksBalance(tb)).toEqual({ balanced: true, debit: 20000, credit: 20000 });
  });

  it("detects imbalance", () => {
    expect(booksBalance([{ account: "cash", debit: 5, credit: 0 }]).balanced).toBe(false);
    expect(booksBalance([])).toEqual({ balanced: true, debit: 0, credit: 0 });
  });
});
