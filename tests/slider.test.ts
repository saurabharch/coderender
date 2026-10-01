import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { TOLERANCE, POW_COUNT, offsetOk, powOk, makeChallenge } from "@/lib/slider-core";

function mine(challenge: string): number {
  for (let n = 0; n < 500000; n++) {
    if (createHash("sha256").update(`${n}${challenge}`).digest("hex").startsWith("000")) return n;
  }
  throw new Error("not found");
}

describe("slider-core", () => {
  it("accepts positions within tolerance", () => {
    expect(offsetOk(0.5, 0.5)).toBe(true);
    expect(offsetOk(0.5, 0.5 + TOLERANCE)).toBe(true);
    expect(offsetOk(0.5, 0.5 + TOLERANCE + 0.01)).toBe(false);
    expect(offsetOk(0.5, NaN)).toBe(false);
  });

  it("issues unique challenges and verifies mined batches", () => {
    const cs = new Set([makeChallenge(), makeChallenge(), makeChallenge()]);
    expect(cs.size).toBe(3);
    expect(POW_COUNT).toBe(3);
    const challenge = [...cs][0];
    const prefix = mine(challenge);
    expect(powOk(String(prefix), challenge)).toBe(true);
    expect(powOk("nope", challenge)).toBe(false);
    expect(powOk(String(prefix), "x".repeat(32))).toBe(false);
  });
});
