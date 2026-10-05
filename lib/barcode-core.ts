// Pure barcode math (no sqlite — safe for vitest). EAN-13 for shelf labels;
// ISBN/IMEI/EAN-13 passthrough validated by shape, custom codes free-form.

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
  if (type === "ean" || type === "upc") return eanValid(c);
  return c.length <= 40;
}
