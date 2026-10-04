import { describe, expect, it } from "vitest";
import { couponOff, orderCan, quoteCart, splitTax, toBase } from "@/lib/commerce-core";

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
