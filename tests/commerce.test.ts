import { describe, expect, it } from "vitest";
import { couponOff, orderCan, quoteCart, resolvePrice, splitTax, toBase } from "@/lib/commerce-core";

describe("commerce-core", () => {
  it("converts units to base", () => {
    expect(toBase(2, "kg")).toEqual({ qty: 2000, unit: "g" });
    expect(toBase(1, "dozen")).toEqual({ qty: 12, unit: "pc" });
    expect(toBase(3, "box", 6)).toEqual({ qty: 18, unit: "pc" });
    expect(toBase(5, "mystery")).toEqual({ qty: 5, unit: "mystery" });
  });

  it("splits GST intra/inter, exclusive/inclusive", () => {
    expect(splitTax(10000, 18, false, false)).toEqual({ cgst: 900, sgst: 900, igst: 0, total: 1800 });
    expect(splitTax(10000, 18, true, false)).toEqual({ cgst: 0, sgst: 0, igst: 1800, total: 1800 });
    const inc = splitTax(11800, 18, false, true);
    expect(inc.total).toBe(1800);
    expect(inc.cgst + inc.sgst).toBe(1800);
    expect(splitTax(5000, 0, false, false).total).toBe(0);
  });

  it("validates coupons", () => {
    expect(couponOff(10000, { code: "F", kind: "flat", value: 1000 }).off).toBe(1000);
    expect(couponOff(10000, { code: "P", kind: "pct", value: 10 }).off).toBe(1000);
    expect(couponOff(10000, { code: "C", kind: "pct", value: 50, maxOff: 2000 }).off).toBe(2000);
    expect(couponOff(500, { code: "M", kind: "flat", value: 100, minOrder: 1000 }).reason).toMatch(/needs/);
    expect(couponOff(5000, { code: "E", kind: "flat", value: 100, endsAt: "2000-01-01" }).reason).toBe("expired");
  });

  it("quotes carts with proportional discount + tax", () => {
    const q = quoteCart(
      [{ productId: 1, qty: 2, price: 5000, taxPct: 18 }],
      { inter: false, inclusive: false, coupon: { code: "P", kind: "pct", value: 10 } },
    );
    expect(q.subtotal).toBe(10000);
    expect(q.discount).toBe(1000);
    expect(q.taxTotal).toBe(1620);
    expect(q.grand).toBe(9000 + 1620);
    expect(q.coupon).toBe("P");
  });

  it("gates order transitions", () => {
    expect(orderCan("draft", "confirmed")).toBe(true);
    expect(orderCan("draft", "fulfilled")).toBe(false);
    expect(orderCan("fulfilled", "returned")).toBe(true);
    expect(orderCan("cancelled", "draft")).toBe(false);
  });
});

describe("resolvePrice", () => {
  const rows = [
    { priceType: "retail", amount: 10000, minQty: 0, startsAt: "", endsAt: "", active: 1 },
    { priceType: "pos", amount: 9500, minQty: 0, startsAt: "", endsAt: "", active: 1 },
    { priceType: "wholesale", amount: 8000, minQty: 0, startsAt: "", endsAt: "", active: 1 },
    { priceType: "sale", amount: 7000, minQty: 0, startsAt: "2000-01-01", endsAt: "2100-01-01", active: 1 },
  ];
  it("prefers live sale windows over everything", () => {
    expect(resolvePrice(10000, rows, { channel: "pos" })).toEqual({ price: 7000, source: "sale" });
  });
  it("resolves member/wholesale groups and channels", () => {
    expect(resolvePrice(10000, rows.filter((r) => r.priceType !== "sale"), { cgroup: "wholesale" }).price).toBe(8000);
    expect(resolvePrice(10000, rows.filter((r) => r.priceType !== "sale"), { channel: "pos" }).price).toBe(9500);
    expect(resolvePrice(10000, [], {})).toEqual({ price: 10000, source: "base" });
  });
  it("respects minQty and windows", () => {
    const bulk = [{ priceType: "wholesale", amount: 5000, minQty: 10, startsAt: "", endsAt: "", active: 1 }];
    expect(resolvePrice(10000, bulk, { channel: "wholesale", qty: 2 }).source).toBe("base");
    expect(resolvePrice(10000, bulk, { channel: "wholesale", qty: 10 }).price).toBe(5000);
    const expired = [{ priceType: "sale", amount: 1000, minQty: 0, startsAt: "2000-01-01", endsAt: "2000-02-01", active: 1 }];
    expect(resolvePrice(10000, expired, {}).source).toBe("base");
  });
});
