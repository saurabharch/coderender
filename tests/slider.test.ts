import { describe, expect, it } from "vitest";
import { TOLERANCE, offsetOk, powOk } from "@/lib/slider-core";

describe("slider-core", () => {
  it("accepts positions within tolerance", () => {
    expect(offsetOk(0.5, 0.5)).toBe(true);
    expect(offsetOk(0.5, 0.5 + TOLERANCE)).toBe(true);
    expect(offsetOk(0.5, 0.5 + TOLERANCE + 0.01)).toBe(false);
    expect(offsetOk(0.5, NaN)).toBe(false);
  });

  it("rejects bad nonces, accepts a mined one", async () => {
    expect(powOk("abc123", "nope")).toBe(false);
    expect(powOk("abc123", "x".repeat(33))).toBe(false);
    const { createHash } = await import("node:crypto");
    let found = "";
    for (let n = 0; n < 100000 && !found; n++) {
      const nonce = n.toString(36);
      if (createHash("sha256").update(`abc123:${nonce}`).digest("hex").startsWith("00")) found = nonce;
    }
    expect(found).not.toBe("");
    expect(powOk("abc123", found)).toBe(true);
  });
});
