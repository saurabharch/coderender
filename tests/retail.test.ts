import { describe, expect, it } from "vitest";
import { isAbandoned, renderMessage, settleDrawer, shipCan } from "@/lib/retail-core";

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
});
