import { describe, expect, it } from "vitest";
import { hexToTuple, shadeTriplet } from "@/lib/brand";

describe("brand theme math", () => {
  it("builds a 10-step tuple anchored at index 6", () => {
    const t = hexToTuple("#0d9488");
    expect(t).toHaveLength(10);
    expect(t![6]).toBe("#0d9488");
    expect(t![0]).not.toBe(t![9]);
  });

  it("rejects bad hex", () => {
    expect(hexToTuple("teal")).toBe(null);
    expect(hexToTuple("#12345")).toBe(null);
  });

  it("shades triplets for CSS vars", () => {
    expect(shadeTriplet("#0d9488", 0)).toBe("13 148 136");
    expect(shadeTriplet("#0d9488", 1)).toBe("255 255 255");
    expect(shadeTriplet("nope", 0)).toBe(null);
  });
});
