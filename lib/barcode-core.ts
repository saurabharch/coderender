// Pure barcode math (no sqlite — safe for vitest). EAN-13 for shelf labels;
// ISBN/IMEI/EAN-13 passthrough validated by shape, custom codes free-form.

export type BarcodeType =
  | "UPC_A" | "UPC_E" | "EAN_13" | "EAN_8" | "CODE_128" | "CODE_39"
  | "ITF_14" | "GS1_128" | "GS1_DATAMATRIX" | "INTERNAL" | "WEIGHTED" | "COUPON" | "UNKNOWN";

// Scanner input: trim, strip whitespace/CR/LF/terminators, keep leading zeros
// (never coerce to a number).
export function normalizeBarcode(value: string): string {
  return String(value ?? "").replace(/[\r\n\t]/g, "").replace(/\s+/g, "").trim();
}

function upcCheck(stem11: string): string {
  const d = stem11.replace(/\D/g, "").padStart(11, "0").slice(-11);
  let odd = 0, even = 0;
  for (let i = 0; i < 11; i++) {
    if (i % 2 === 0) odd += Number(d[i]);
    else even += Number(d[i]);
  }
  return String((10 - ((odd * 3 + even) % 10)) % 10);
}

export function upcValid(code: string): boolean {
  const d = code.replace(/\D/g, "");
  return d.length === 12 && upcCheck(d.slice(0, 11)) === d[11];
}

function ean8Check(stem7: string): string {
  const d = stem7.replace(/\D/g, "").padStart(7, "0").slice(-7);
  let sum = 0;
  for (let i = 0; i < 7; i++) sum += Number(d[i]) * (i % 2 === 0 ? 3 : 1);
  return String((10 - (sum % 10)) % 10);
}

export function ean8Valid(code: string): boolean {
  const d = code.replace(/\D/g, "");
  return d.length === 8 && ean8Check(d.slice(0, 7)) === d[7];
}

// Weighted (price-embedded) 13-digit: 2X prefix — value decoded by the POS,
// never treated as a plain product code.
export function weightedInfo(code: string): { prefix: string; item: string; value: number } | null {
  const d = code.replace(/\D/g, "");
  if (!/^(2[0-9])\d{11}$/.test(d)) return null;
  if (eanCheck(d.slice(0, 12)) !== d[12]) return null;
  return { prefix: d.slice(0, 2), item: d.slice(2, 7), value: Number(d.slice(7, 12)) };
}

export interface BarcodeValidation {
  valid: boolean; normalized: string; type: BarcodeType;
  checksumValid: boolean | null; errors: { code: string; message: string }[];
}

// Detection = structure + checksum where one exists, never length alone.
export function validateBarcode(raw: string): BarcodeValidation {
  const normalized = normalizeBarcode(raw);
  const errors: { code: string; message: string }[] = [];
  if (!normalized) {
    errors.push({ code: "EMPTY_BARCODE", message: "Barcode is empty." });
    return { valid: false, normalized, type: "UNKNOWN", checksumValid: null, errors };
  }
  const fail = (type: BarcodeType, code: string, message: string, checksum: boolean | null = null) => {
    errors.push({ code, message });
    return { valid: false, normalized, type, checksumValid: checksum, errors };
  };
  if (/[^0-9A-Za-z\-.$/+% ()]/.test(normalized) && !/^\d+$/.test(normalized)) {
    return fail("UNKNOWN", "INVALID_CHARACTERS", "Barcode has unsupported characters.");
  }
  const digits = normalized.replace(/\D/g, "");
  const isDigits = digits === normalized;
  if (isDigits && normalized.length === 12) {
    return upcValid(normalized)
      ? { valid: true, normalized, type: "UPC_A", checksumValid: true, errors }
      : fail("UPC_A", "INVALID_CHECK_DIGIT", "UPC-A check digit is invalid.", false);
  }
  if (isDigits && normalized.length === 13) {
    if (/^2[0-9]/.test(normalized) && weightedInfo(normalized)) {
      return { valid: true, normalized, type: "WEIGHTED", checksumValid: true, errors };
    }
    return eanValid(normalized)
      ? { valid: true, normalized, type: normalized.startsWith("200") ? "INTERNAL" : "EAN_13", checksumValid: true, errors }
      : fail("EAN_13", "INVALID_CHECK_DIGIT", "EAN-13 check digit is invalid.", false);
  }
  if (isDigits && normalized.length === 8) {
    return ean8Valid(normalized)
      ? { valid: true, normalized, type: "EAN_8", checksumValid: true, errors }
      : fail("EAN_8", "INVALID_CHECK_DIGIT", "EAN-8 check digit is invalid.", false);
  }
  if (isDigits && normalized.length === 14) {
    return { valid: true, normalized, type: "ITF_14", checksumValid: null, errors };
  }
  // GS1-128: Code128 with FNC1 + Application Identifiers in parentheses.
  if (/\(\d{2,4}\)/.test(normalized) && normalized.length <= 100) {
    return { valid: true, normalized, type: "GS1_128", checksumValid: null, errors };
  }
  // GS1 DataMatrix: ECC200 square payload — structure only, no local decode.
  if (/^\[\)>\x1E\d{2}/.test(normalized) || (/^[A-Za-z0-9+/=]{32,}$/.test(normalized) && normalized.length % 4 === 0)) {
    return { valid: true, normalized, type: "GS1_DATAMATRIX", checksumValid: null, errors };
  }
  if (/^[0-9A-Z\-.$/+% ]{4,48}$/i.test(normalized)) {
    const t = /^[0-9A-Z]+$/i.test(normalized.replace(/[-.$/+% ]/g, "")) ? "CODE_128" : "CODE_39";
    return { valid: true, normalized, type: t as BarcodeType, checksumValid: null, errors };
  }
  return fail("UNKNOWN", "UNSUPPORTED_FORMAT", "Unsupported barcode format.");
}

export function detectBarcodeType(raw: string): BarcodeType {
  return validateBarcode(raw).type;
}

const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R = ["1001110", "1100110", "1101100", "1000010", "1011110", "1110100", "1000100", "1001000", "1001010", "1110010"];
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

// Check digit for a 12-digit stem.
export function eanCheck(stem: string): string {
  const d = stem.replace(/\D/g, "").padStart(12, "0").slice(-12);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(d[i]) * (i % 2 === 0 ? 1 : 3);
  return String((10 - (sum % 10)) % 10);
}

export function eanValid(code: string): boolean {
  const d = code.replace(/\D/g, "");
  return d.length === 13 && eanCheck(d.slice(0, 12)) === d[12];
}

// Default shelf code for a product id: 200 + zero-padded id (in-store range).
export function eanFromId(id: number): string {
  const stem = `200${String(Math.abs(Math.round(id))).padStart(9, "0")}`.slice(0, 12);
  return stem + eanCheck(stem);
}

// Full 95-module pattern (guards + digits) for rendering bars.
export function eanPattern(code: string): string | null {
  const d = code.replace(/\D/g, "");
  if (!eanValid(d)) return null;
  const first = Number(d[0]);
  const par = PARITY[first];
  let out = "101";
  for (let i = 1; i <= 6; i++) {
    const table = par[i - 1] === "L" ? L : G;
    out += table[Number(d[i])];
  }
  out += "01010";
  for (let i = 7; i <= 12; i++) out += R[Number(d[i])];
  return out + "101";
}

export function barcodeValid(code: string, type: string): boolean {
  const c = code.trim();
  if (!c) return true;
  if (type === "isbn") return /^(97[89]\d{10}|\d{9}[\dX])$/.test(c.replace(/[-\s]/g, ""));
  if (type === "imei") return /^\d{15}$/.test(c);
  if (type === "ean" || type === "upc") return eanValid(c) || upcValid(c);
  const v = validateBarcode(c);
  return v.valid || type === "custom";
}
