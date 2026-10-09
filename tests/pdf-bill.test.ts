import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderBillPdf } from "@/lib/pdf-bill";

async function pagesOf(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount();
}

const doc = {
  no: "INV-00007", kind: "INVOICE", date: "2026-10-09",
  billTo: "Probe Client · 9000000000",
  lines: [{ label: "Website build", amount: 5000000 }],
  total: 5000000, status: "due ₹50000", memo: "Order #7 (confirmed)",
};
const brand = {
  name: "Probe Biz", address: "1 Main St", phone: "+911234567890",
  email: "biz@example.com", gstin: "27ABCDE1234F1Z5", primary: "#0F8F83",
};

describe("pdf bill themes", () => {
  for (const theme of ["modern", "minimal"] as const) {
    it(`renders a byte-valid ${theme} PDF`, async () => {
      const bytes = await renderBillPdf(doc, brand, theme);
      expect(bytes.length).toBeGreaterThan(1000);
      expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
      expect(await pagesOf(bytes)).toBeGreaterThanOrEqual(1);
    });
  }

  it("falls back on bad brand colors", async () => {
    const bytes = await renderBillPdf(doc, { ...brand, primary: "nope" }, "modern");
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
  });
});
