// Input masks following the Mantine use-mask recipe, kept as pure helpers so
// Vitest can cover them (no DOM, no node:sqlite). Components apply them on
// change; the server still validates strictly.

/** Keep last 10 digits, format as 5+5 for readability. */
export function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(-10);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)} ${d.slice(5)}`;
}

/** Amount entry: digits with up to 2 decimals (float, 2dp). */
export function maskAmount(raw: string): string {
  const clean = raw.replace(/[^0-9.]/g, "");
  const [head, ...rest] = clean.split(".");
  const dec = rest.join("").slice(0, 2);
  const h = head.replace(/^0+(?=\d)/, "");
  return rest.length > 0 ? `${h || "0"}.${dec}` : h;
}

/** True when the masked amount is a valid price/quantity entry. */
export function isAmount(v: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(v.trim()) && v.trim() !== "";
}

/** Natural numbers only (stock, counts): strip non-digits, no leading zeros. */
export function maskInt(raw: string): string {
  const d = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return d;
}

/** Signed qty for stock adjust: optional leading minus + digits. */
export function maskSigned(raw: string): string {
  const t = raw.trim();
  const neg = t.startsWith("-");
  const d = t.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!d) return "";
  return neg ? `-${d}` : d;
}

/** Barcode / loyalty / batch codes: trim, drop spaces, cap length. Verbatim otherwise. */
export function maskBarcode(raw: string, max = 40): string {
  return raw.replace(/\s+/g, "").slice(0, max);
}

/** UPI id: lowercase, no spaces (user@bank). */
export function maskUpi(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, "").slice(0, 60);
}

/** Email: lowercase trim. */
export function maskEmail(raw: string): string {
  return raw.toLowerCase().trim().slice(0, 120);
}

/** Percent 0–100 with up to 2 decimals. */
export function maskPercent(raw: string): string {
  const m = maskAmount(raw);
  if (m === "") return "";
  const n = Number(m);
  if (Number.isNaN(n)) return "";
  return String(Math.min(100, n));
}

/** Year-month YYYY-MM (payroll, mfg/exp pickers fallback). */
export function maskYearMonth(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 6);
  if (d.length <= 4) return d;
  return `${d.slice(0, 4)}-${d.slice(4)}`;
}

/** GSTIN: 15 uppercase alphanumerics. */
export function maskGst(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
}

/** Pincode: 6 digits. */
export function maskPin(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}
