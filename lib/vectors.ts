// Lexical-semantic memory without any model: hashed character-trigram vectors
// (256 dims, L2-normalized) stored as JSON in SQLite, cosine retrieval scoped
// per thread. No embeddings API, no native deps — and honest about it.
const DIM = 256;

export function embed(text: string): number[] {
  const v = new Array<number>(DIM).fill(0);
  const t = `  ${text.toLowerCase()}  `;
  for (let i = 0; i < t.length - 2; i++) {
    const tri = t.slice(i, i + 3);
    let h = 0;
    for (let j = 0; j < tri.length; j++) h = (h * 31 + tri.charCodeAt(j)) >>> 0;
    v[h % DIM] += 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => Math.round((x / norm) * 10000) / 10000);
}

export function cosine(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) s += a[i] * b[i];
  return s;
}

export function parseVec(raw: string | null): number[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) && v.length === DIM ? (v as number[]) : null;
  } catch {
    return null;
  }
}
