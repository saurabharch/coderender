import { describe, expect, it } from "vitest";
import { barcodeValid, eanCheck, eanFromId, eanPattern, eanValid } from "@/lib/barcode-core";

describe("barcode-core", () => {
  it("checks EAN-13 digits", () => {
    expect(eanCheck("200000000001")).toHaveLength(1);
    const full = `200000000001${eanCheck("200000000001")}`;
    expect(eanValid(full)).toBe(true);
    expect(eanValid("2000000000000")).toBe(false);
  });

  it("mints stable shelf codes per product", () => {
    expect(eanFromId(7)).toBe(eanFromId(7));
    expect(eanValid(eanFromId(7))).toBe(true);
    expect(eanFromId(7)).not.toBe(eanFromId(8));
  });

  it("renders 95 modules", () => {
    const p = eanPattern(eanFromId(42));
    expect(p).toHaveLength(95);
    expect(p!.startsWith("101")).toBe(true);
    expect(p!.endsWith("101")).toBe(true);
    expect(eanPattern("bogus")).toBeNull();
  });

  it("validates typed codes", () => {
    expect(barcodeValid("9780201633610", "isbn")).toBe(true);
    expect(barcodeValid("490154203237518", "imei")).toBe(true);
    expect(barcodeValid("nope-not-13-digits", "ean")).toBe(false);
    expect(barcodeValid("LOOSE-001", "custom")).toBe(true);
  });
});
