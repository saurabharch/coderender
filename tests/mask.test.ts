import { describe, expect, it } from "vitest";
import { isAmount, maskAmount, maskPhone } from "@/lib/mask";

describe("input masks (mantine use-mask recipe)", () => {
  it("masks phones to last 10 digits, 5+5", () => {
    expect(maskPhone("+91-9831778894")).toBe("98317 78894");
    expect(maskPhone("123")).toBe("123");
    expect(maskPhone("")).toBe("");
  });

  it("masks amounts to digits + 2dp", () => {
    expect(maskAmount("₹199.999")).toBe("199.99");
    expect(maskAmount("007")).toBe("07".replace(/^0+(?=\d)/, ""));
    expect(maskAmount("12.3.4")).toBe("12.34");
    expect(maskAmount("abc")).toBe("");
  });

  it("validates amounts strictly", () => {
    expect(isAmount("199.99")).toBe(true);
    expect(isAmount("200")).toBe(true);
    expect(isAmount("199.999")).toBe(false);
    expect(isAmount("")).toBe(false);
  });
});
