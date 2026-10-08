// Pure offline product catalog for the POS counter (no sqlite, no window —
// safe for vitest; the component owns localStorage). Cached prices are an
// honest estimate: the server re-prices authoritatively on sync.
export interface CatItem {
  id: number;
  name: string;
  price: number;
  code?: string;
}

export const CATALOG_CAP = 500;

/** Merge fresh items into the cache (fresh wins, newest-first, capped). */
export function mergeCatalog(prev: CatItem[], fresh: CatItem[]): CatItem[] {
  const byId = new Map<number, CatItem>();
  for (const f of fresh) {
    if (Number(f.id) > 0) byId.set(Number(f.id), { ...f, id: Number(f.id) });
  }
  const out = [...byId.values()];
  for (const p of prev) {
    if (!byId.has(p.id)) out.push(p);
    if (out.length >= CATALOG_CAP) break;
  }
  return out.slice(0, CATALOG_CAP);
}

/** Exact code match (case-insensitive); caller handles weighted variants. */
export function findByCode(catalog: CatItem[], code: string): CatItem | null {
  const c = code.trim().toLowerCase();
  if (!c) return null;
  return catalog.find((i) => (i.code ?? "").toLowerCase() === c) ?? null;
}

/** Substring name/code search, capped. */
export function searchCatalog(catalog: CatItem[], q: string, limit = 8): CatItem[] {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return [];
  return catalog
    .filter((i) =>
      i.name.toLowerCase().includes(needle) || (i.code ?? "").toLowerCase().includes(needle))
    .slice(0, Math.max(1, limit));
}
