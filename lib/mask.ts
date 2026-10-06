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
