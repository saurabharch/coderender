import { describe, expect, it } from "vitest";
import { avgCost, ledgerLevel, needsReorder, poCan } from "@/lib/inventory-core";

describe("inventory-core", () => {
  it("nets ledger moves", () => {
    expect(ledgerLevel([
      { kind: "in", qty: 10 }, { kind: "out", qty: 3 },
      { kind: "reserve", qty: 2 }, { kind: "release", qty: 2 },
      { kind: "adjust", qty: -1 },
    ])).toBe(6);
    expect(ledgerLevel([
      { kind: "transfer", qty: 5, toWh: true }, { kind: "transfer", qty: 5 },
    ])).toBe(0);
  });

  it("averages cost on receive", () => {
    expect(avgCost(10, 10000, 10, 20000)).toBe(15000);
    expect(avgCost(0, 0, 5, 8000)).toBe(8000);
    expect(avgCost(10, 10000, 0, 20000)).toBe(10000);
  });

  it("flags reorder + gates PO flow", () => {
    expect(needsReorder(5, 5)).toBe(true);
    expect(needsReorder(6, 5)).toBe(false);
    expect(poCan("draft", "sent")).toBe(true);
    expect(poCan("draft", "paid")).toBe(false);
    expect(poCan("received", "billed")).toBe(true);
    expect(poCan("billed", "paid")).toBe(true);
  });
});

describe("loss moves + upc-e", () => {
  it("nets damage/expiry/returns in the ledger", async () => {
    const { ledgerLevel } = await import("@/lib/inventory-core");
    expect(ledgerLevel([
      { kind: "in", qty: 10 }, { kind: "damage", qty: 2 },
      { kind: "expiry", qty: 1 }, { kind: "purchase-return", qty: 1 },
      { kind: "sale-return", qty: 3 }, { kind: "count", qty: -1 },
    ])).toBe(8);
  });
  it("expands UPC-E and validates", async () => {
    const { upcEExpand, upcEValid } = await import("@/lib/barcode-core");
    const exp = upcEExpand("042100");
    expect(exp).toHaveLength(12);
    expect(upcEValid("042100")).toBe(true);
    // 6-digit UPC-E carries no check digit — structural validity only.
    expect(upcEValid("042101")).toBe(true);
    expect(upcEValid("04210")).toBe(false);
  });
});
