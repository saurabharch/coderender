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
