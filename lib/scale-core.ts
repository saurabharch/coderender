// Pure scale-platform helpers (no sqlite — safe for vitest).

export const ROLES = ["owner", "manager", "sales", "cashier", "inventory", "accountant", "hr", "marketing", "staff"] as const;

export type Perm =
  | "sell" | "stock" | "billing" | "crm" | "retail" | "people" | "marketing"
  | "services" | "settings" | "keys" | "partners" | "reports";

const MATRIX: Record<string, Perm[]> = {
  owner: ["sell", "stock", "billing", "crm", "retail", "people", "marketing", "services", "settings", "keys", "partners", "reports"],
  manager: ["sell", "stock", "billing", "crm", "retail", "people", "marketing", "services", "partners", "reports"],
  sales: ["sell", "crm", "services", "reports"],
  cashier: ["sell", "retail"],
  inventory: ["stock", "reports"],
  accountant: ["billing", "stock", "reports"],
  hr: ["people", "reports"],
  marketing: ["marketing", "crm", "reports"],
  staff: [],
};

export function hasPerm(role: string, perm: Perm): boolean {
  if (role === "owner") return true;
  const r = role === "member" ? "manager" : role; // legacy member = manager
  return (MATRIX[r] ?? []).includes(perm);
}

export function rolePerms(role: string): Perm[] {
  if (role === "owner") return MATRIX.owner;
  if (role === "member") return MATRIX.manager;
  return MATRIX[role] ?? [];
}

// Royalty: pct of branch invoiced revenue in the window.
export function royaltyDue(revenue: number, pct: number): number {
  return Math.max(0, Math.round((Math.max(0, revenue) * Math.max(0, Math.min(100, pct))) / 100));
}

// Minimal RFC-4180 CSV: parse + build (quotes, commas, newlines).
export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const rows: string[][] = [];
  let cur = "", row: string[] = [], quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { cur += '"'; i++; }
        else quoted = false;
      } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (c === "\r") { /* skip */ }
    else cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  const nonEmpty = rows.filter((r) => r.some((v) => v.trim() !== ""));
  if (!nonEmpty.length) return { headers: [], rows: [] };
  const headers = nonEmpty[0].map((h) => h.trim());
  return {
    headers,
    rows: nonEmpty.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()]))),
  };
}

export function buildCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}
