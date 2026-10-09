// Server bill PDFs (pdf-lib, standard fonts only — no downloads, no native
// deps). Pure data in, bytes out: the route reads prefs/ledger, this module
// only draws. Money in paise (int).
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export interface BillLine {
  label: string;
  amount: number;
}

export interface BillDocInput {
  no: string;
  kind: string;
  date: string;
  billTo: string;
  lines: BillLine[];
  total: number;
  status: string;
  memo: string;
}

export interface BillBrand {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  primary: string;
}

export type BillTheme = "modern" | "minimal";

const A4 = { w: 595.28, h: 841.89 };
const M = 48;

function hex(hexStr: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec((hexStr || "").trim());
  if (!m) return { r: 0.06, g: 0.56, b: 0.51 }; // CodeRender teal fallback
  const n = parseInt(m[1], 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

const inr = (paise: number): string => `Rs. ${(Math.round(paise) / 100).toFixed(2)}`;

// Standard PDF fonts are WinAnsi-only: fold common symbols to ASCII so a
// business name or memo can never break the render.
export function pdfText(s: string): string {
  return String(s ?? "")
    .replace(/₹/g, "Rs.")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/[^\x20-\x7e\n]/g, "");
}

interface Ctx {
  doc: PDFDocument;
  font: PDFFont;
  bold: PDFFont;
  page: PDFPage;
  y: number;
  W: number;
  H: number;
}

/** Thermal roll width in mm → PDF points. */
export function rollPt(mm: number): number {
  return Math.round(mm * 2.83465);
}

function newPage(ctx: Ctx): void {
  ctx.page = ctx.doc.addPage([ctx.W, ctx.H]);
  ctx.y = ctx.H - M;
}

// Word-wrap to a measure (pure helper, tested). Long words hard-break.
export function wrapText(
  measure: (s: string, size: number) => number, text: string, size: number, maxW: number,
): string[] {
  const out: string[] = [];
  for (const para of String(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      let w = word;
      while (measure(w, size) > maxW && w.length > 1) {
        let cut = w.length - 1;
        while (cut > 1 && measure(w.slice(0, cut), size) > maxW) cut--;
        out.push(w.slice(0, cut));
        w = w.slice(cut);
      }
      const trial = line ? `${line} ${w}` : w;
      if (measure(trial, size) <= maxW) line = trial;
      else {
        if (line) out.push(line);
        line = w;
      }
    }
    if (line) out.push(line);
  }
  return out.length ? out : [""];
}

function ensure(ctx: Ctx, need: number): void {
  if (ctx.y - need < M) newPage(ctx);
}

function line(ctx: Ctx, text: string, opts: { size?: number; bold?: boolean; right?: string; gap?: number } = {}): void {
  const size = opts.size ?? 10;
  const f = opts.bold ? ctx.bold : ctx.font;
  const maxW = ctx.W - M * 2;
  const right = opts.right !== undefined ? pdfText(opts.right) : undefined;
  const rightW = right !== undefined ? f.widthOfTextAtSize(right, size) + 8 : 0;
  const rows = wrapText((s, z) => f.widthOfTextAtSize(s, z), pdfText(text), size, maxW - rightW).slice(0, 6);
  rows.forEach((row, i) => {
    ensure(ctx, size + 8);
    ctx.page.drawText(row, { x: M, y: ctx.y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
    if (i === 0 && right !== undefined) {
      ctx.page.drawText(right, { x: ctx.W - M - (rightW - 8), y: ctx.y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
    }
    ctx.y -= size + 4;
  });
  ctx.y -= opts.gap ?? 2;
}

function rule(ctx: Ctx, color = { r: 0.8, g: 0.8, b: 0.8 }): void {
  ctx.page.drawLine({
    start: { x: M, y: ctx.y },
    end: { x: ctx.W - M, y: ctx.y },
    thickness: 1,
    color: rgb(color.r, color.g, color.b),
  });
  ctx.y -= 10;
}

/** Render an invoice/receipt/transcript. Returns raw PDF bytes. Pass
 *  `rollMm` (58|72|80) for a narrow thermal roll instead of A4. */
export async function renderBillPdf(
  doc: BillDocInput, brand: BillBrand, theme: BillTheme,
  opts: { rollMm?: number } = {},
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const roll = opts.rollMm === 58 || opts.rollMm === 72 || opts.rollMm === 80 ? opts.rollMm : 0;
  const W = roll ? rollPt(roll) : A4.w;
  const H = A4.h;
  const ctx: Ctx = { doc: pdf, font, bold, page: pdf.addPage([W, H]), y: H - M, W, H };
  const accent = theme === "modern" ? hex(brand.primary) : { r: 0.2, g: 0.2, b: 0.2 };

  if (theme === "modern") {
    ctx.page.drawRectangle({
      x: 0, y: H - 92, width: W, height: 92,
      color: rgb(accent.r, accent.g, accent.b),
    });
    ctx.page.drawText(pdfText(brand.name || "Bill"), { x: M, y: H - 44, size: 20, font: bold, color: rgb(1, 1, 1) });
    ctx.page.drawText(pdfText(doc.kind), { x: M, y: H - 64, size: 11, font, color: rgb(1, 1, 1) });
    const nw = bold.widthOfTextAtSize(pdfText(doc.no), 14);
    ctx.page.drawText(pdfText(doc.no), { x: W - M - nw, y: H - 50, size: 14, font: bold, color: rgb(1, 1, 1) });
    ctx.y = H - 112;
  } else {
    line(ctx, brand.name || "Bill", { size: 18, bold: true });
    line(ctx, doc.kind, { size: 11 });
    rule(ctx);
  }

  if (brand.address) line(ctx, brand.address, { size: 9 });
  const contact = [brand.phone, brand.email].filter(Boolean).join(" · ");
  if (contact) line(ctx, contact, { size: 9 });
  if (brand.gstin) line(ctx, `GSTIN ${brand.gstin}`, { size: 9 });
  rule(ctx, accent);
  line(ctx, `Bill to: ${doc.billTo}`, { size: 10, bold: true, right: doc.date });
  line(ctx, `Status: ${doc.status}`, { size: 10 });
  rule(ctx, accent);

  line(ctx, "Particulars", { size: 9, bold: true, right: "Amount" });
  for (const l of doc.lines.slice(0, 200)) {
    ensure(ctx, 24);
    line(ctx, l.label || "Item", { size: 10, right: inr(l.amount) });
  }
  rule(ctx, accent);
  ensure(ctx, 30);
  line(ctx, "Total", { size: 13, bold: true, right: inr(doc.total) });
  if (doc.memo) {
    ensure(ctx, 24);
    line(ctx, doc.memo, { size: 9 });
  }
  ctx.y -= 8;
  line(ctx, "Generated by CodeRender · computer-generated, no signature needed.", { size: 8 });
  return pdf.save();
}
