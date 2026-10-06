import { describe, expect, it } from "vitest";
import { isAmount, maskAmount, maskBarcode, maskEmail, maskGst, maskInt, maskPercent, maskPhone, maskPin, maskSigned, maskUpper, maskUpi, maskYearMonth } from "@/lib/mask";

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

  it("masks ints, signed qty, barcodes", () => {
    expect(maskInt("007a")).toBe("7");
    expect(maskSigned("-003")).toBe("-3");
    expect(maskSigned("  +12x")).toBe("12");
    expect(maskBarcode(" 8901 2345 ", 10)).toBe("89012345");
  });

  it("masks upi/email/percent/month/gst/pin", () => {
    expect(maskUpi(" Merchant@UPI ")).toBe("merchant@upi");
    expect(maskEmail(" Boss@Shop.IN ")).toBe("boss@shop.in");
    expect(maskPercent("150")).toBe("100");
    expect(maskPercent("12.345")).toBe("12.34");
    expect(maskYearMonth("202610")).toBe("2026-10");
    expect(maskGst("27abc de1234f1z5!")).toBe("27ABCDE1234F1Z5");
    expect(maskPin("4000012")).toBe("400001");
  });

  it("uppercases codes", () => {
    expect(maskUpper(" diwali10 ")).toBe("DIWALI10");
    expect(maskUpper("a  b")).toBe("A B");
  });
});
