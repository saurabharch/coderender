// Server label-sheet PDFs (pdf-lib + qrcode, standard PDF fonts only).
// Pure data in, bytes out: the studio posts its run (items + settings),
// this module draws the A4 grid. Bars come from existing EAN pattern math.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { eanPattern } from "./barcode-core";
import { pdfText, wrapText } from "./pdf-bill";
import { parseLabelTemplate, type LabelSettings } from "./label-template";

export interface SheetItem {
  name: string;
  price: number;
  mrp: number;
  barcode: string;
  sku: string;
  id: number;
}

export interface SheetResult {
  bytes: Uint8Array;
  stickers: number;
  pages: number;
}

const PT = 2.83465; // mm → pt
const A4W = 595.28;
const A4H = 841.89;

/** Validate a studio settings payload for sheet rendering (null = reject). */
export function sheetSettings(raw: unknown): LabelSettings | null {
  return parseLabelTemplate(raw);
}

export async function renderLabelSheet(
  items: SheetItem[], settings: LabelSettings, mode: "both" | "qr" | "barcode",
): Promise<SheetResult> {
  const clean = items
    .filter((x) => x && typeof x.name === "string")
    .slice(0, 500)
    .map((x) => ({
      name: String(x.name).slice(0, 80),
      price: Math.max(0, Math.round(Number(x.price) || 0)),
      mrp: Math.max(0, Math.round(Number(x.mrp) || 0)),
      barcode: String(x.barcode || "").slice(0, 40),
      sku: String(x.sku || "").slice(0, 40),
      id: Number(x.id) || 0,
    }));
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const stW = settings.stW * PT;
  const stH = settings.stH * PT;
  const gapX = settings.gapX * PT;
  const gapY = settings.gapY * PT;
  const padX = 28; // ~10mm fixed sheet margins
  const padY = 28;
  const cols = Math.max(1, Math.floor((A4W - padX * 2 + gapX) / (stW + gapX)));
  const rows = Math.max(1, Math.floor((A4H - padY * 2 + gapY) / (stH + gapY)));
  const perPage = cols * rows;
  const show = settings.show;
  let page = pdf.addPage([A4W, A4H]);
  let pages = 1;
  let placed = 0;

  for (const [n, it] of clean.entries()) {
    if (n > 0 && n % perPage === 0) {
      page = pdf.addPage([A4W, A4H]);
      pages++;
    }
    const slot = n % perPage;
    const col = slot % cols;
    const row = Math.floor(slot / cols);
    const x0 = padX + col * (stW + gapX);
    const yTop = A4H - padY - row * (stH + gapY);
    const y0 = yTop - stH;
    const cx = x0 + 4;
    let y = yTop - 9;
    const maxW = stW - 8;
    const draw = (s: string, size: number, b = false) => {
      const f = b ? bold : font;
      for (const ln of wrapText((t, z) => f.widthOfTextAtSize(t, z), pdfText(s), size, maxW).slice(0, 2)) {
        if (y < y0 + 14) break;
        page.drawText(ln, { x: cx, y, size, font: f, color: rgb(0, 0, 0) });
        y -= size + 1;
      }
    };
    if (show.name) draw(it.name, 7, true);
    if (show.pid || show.sku) {
      draw(`${show.pid ? `#${it.id}` : ""}${show.pid && show.sku ? " " : ""}${show.sku ? it.sku : ""}`, 6);
    }
    if (show.price || show.mrp) {
      draw(`${show.price ? `Rs.${(it.price / 100).toFixed(0)}` : ""}${show.price && show.mrp && it.mrp > it.price ? ` was Rs.${(it.mrp / 100).toFixed(0)}` : ""}`, 8, true);
    }
    // Codes row: QR left, bars right.
    const codeY = y - 2;
    if ((mode === "both" || mode === "qr") && show.qr) {
      try {
        const url = await QRCode.toDataURL(it.barcode || it.sku || it.name, { width: 120, margin: 0 });
        const png = await pdf.embedPng(Buffer.from(url.split(",")[1], "base64"));
        const s = Math.min(34, maxW / 2 - 2, codeY - y0 - 2);
        if (s > 8) page.drawImage(png, { x: cx, y: codeY - s, width: s, height: s });
      } catch { /* QR never breaks the sheet */ }
    }
    if ((mode === "both" || mode === "barcode") && show.barcode) {
      const pattern = eanPattern(it.barcode);
      if (pattern) {
        const mw = (maxW / 2 - 2) / pattern.length;
        const bh = Math.min(22, codeY - y0 - 2);
        if (mw > 0.2 && bh > 4) {
          let bx = cx + maxW / 2 + 2;
          for (const bit of pattern) {
            if (bit === "1") page.drawRectangle({ x: bx, y: codeY - bh, width: Math.max(0.4, mw), height: bh, color: rgb(0, 0, 0) });
            bx += mw;
          }
        }
      }
    }
    placed++;
  }
  return { bytes: await pdf.save(), stickers: placed, pages };
}
