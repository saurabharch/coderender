import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderLabelSheet } from "@/lib/pdf-labels";
import { parseLabelTemplate } from "@/lib/label-template";

const settings = parseLabelTemplate({ stW: 50, stH: 30, mode: "both" })!;
const items = [
  { id: 1, name: "Probe Widget with a fairly long display name", price: 19900, mrp: 24900, barcode: "2000000000104", sku: "PW-1" },
  { id: 2, name: "No-code item", price: 500, mrp: 0, barcode: "not-a-barcode", sku: "" },
];

describe("label sheet pdf", () => {
  it("renders a byte-valid A4 sheet", async () => {
    const r = await renderLabelSheet(items, settings, "both");
    expect(Buffer.from(r.bytes.slice(0, 5)).toString()).toBe("%PDF-");
    expect(r.stickers).toBe(2);
    expect(await PDFDocument.load(r.bytes).then((d) => d.getPageCount())).toBeGreaterThanOrEqual(1);
  });

  it("tolerates invalid barcodes without breaking", async () => {
    const r = await renderLabelSheet([items[1]], settings, "barcode");
    expect(r.stickers).toBe(1);
    expect(Buffer.from(r.bytes.slice(0, 5)).toString()).toBe("%PDF-");
  });

  it("rejects empty runs", async () => {
    const r = await renderLabelSheet([], settings, "both");
    expect(r.stickers).toBe(0);
  });
});
