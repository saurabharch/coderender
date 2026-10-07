import { describe, expect, it } from "vitest";
import { buildTrackingUrl, isAbandoned, receiptNo, renderMessage, settleDrawer, shipCan } from "@/lib/retail-core";

describe("retail-core", () => {
  it("ages carts into abandoned", () => {
    const old = new Date(Date.now() - 4 * 3600_000).toISOString();
    const fresh = new Date().toISOString();
    expect(isAbandoned(old, null)).toBe(true);
    expect(isAbandoned(fresh, null)).toBe(false);
    expect(isAbandoned(old, fresh)).toBe(false);
  });

  it("settles drawers", () => {
    expect(settleDrawer(10000, 5000, 15200)).toEqual({ expected: 15000, diff: 200 });
    expect(settleDrawer(10000, 5000, 14800).diff).toBe(-200);
  });

  it("gates shipment flow + renders variables", () => {
    expect(shipCan("created", "packed")).toBe(true);
    expect(shipCan("created", "delivered")).toBe(false);
    expect(shipCan("shipped", "rto")).toBe(true);
    expect(shipCan("rto", "shipped")).toBe(true);
    expect(renderMessage("Hi {{name}}, {{coupon}}", { name: "Asha", coupon: "D10" })).toBe("Hi Asha, D10");
  });

  it("builds courier tracking urls", () => {
    expect(buildTrackingUrl("https://x.test/track/{tracking}", "DLV 123")).toBe("https://x.test/track/DLV%20123");
    expect(buildTrackingUrl("https://x.test/home", "DLV123")).toBe(null);
    expect(buildTrackingUrl("https://x.test/track/{tracking}", "  ")).toBe(null);
  });

  it("numbers cash receipts", () => {
    expect(receiptNo(25, "2026-10-07 12:00:00")).toBe("CRN-20261007-25");
    expect(receiptNo(0)).toMatch(/^CRN-\d{8}-0$/);
  });
});
