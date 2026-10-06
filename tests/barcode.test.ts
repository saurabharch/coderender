import { describe, expect, it } from "vitest";
import { barcodeValid, detectBarcodeType, eanCheck, eanFromId, eanPattern, eanValid, normalizeBarcode, upcValid, validateBarcode, weightedInfo } from "@/lib/barcode-core";

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

  it("normalizes scanner input without losing zeroes", () => {
    expect(normalizeBarcode(" 036000291452\n")).toBe("036000291452");
    expect(normalizeBarcode("  8901234567895\r\n")).toBe("8901234567895");
  });

  it("detects UPC-A/EAN-8/weighted by structure + checksum", () => {
    expect(upcValid("036000291452")).toBe(true);
    expect(upcValid("036000291453")).toBe(false);
    expect(detectBarcodeType("036000291452")).toBe("UPC_A");
    expect(detectBarcodeType("96385074")).toBe("EAN_8");
    expect(detectBarcodeType("8901234567890")).toBe("EAN_13");
    const w = weightedInfo("2001234567893");
    expect(w).toEqual({ prefix: "20", item: "01234", value: 56789 });
  });

  it("returns structured validation, not bare booleans", () => {    const bad = validateBarcode("036000291453");
    expect(bad.valid).toBe(false);
    expect(bad.errors[0]?.code).toBe("INVALID_CHECK_DIGIT");
    expect(validateBarcode("").errors[0]?.code).toBe("EMPTY_BARCODE");
    const good = validateBarcode("8901234567890");
    expect(good.valid && good.type === "EAN_13" && good.checksumValid).toBe(true);
  });
});

describe("gs1 + availability", () => {
  it("spots GS1-128 application identifiers", async () => {
    const { validateBarcode } = await import("@/lib/barcode-core");
    expect(validateBarcode("(01)8901234567890(17)251231").type).toBe("GS1_128");
  });
});
