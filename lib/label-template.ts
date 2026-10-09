// Pure label-template validation (no sqlite — safe for vitest). Templates
// are settings JSON only (paper/sticker/mode/toggles) — never code. Unknown
// keys are dropped so a hostile or stale payload can't smuggle behavior.

export interface LabelShow {
  name: boolean; pid: boolean; price: boolean; mrp: boolean;
  barcode: boolean; qr: boolean; sku: boolean; batch: boolean;
}

export interface LabelSettings {
  paper: "roll80" | "roll58" | "a4" | "custom";
  paperW: number; paperH: number;
  orient: "portrait" | "landscape";
  stW: number; stH: number;
  gapX: number; gapY: number; padX: number; padY: number;
  mode: "both" | "qr" | "barcode";
  show: LabelShow;
}

const num = (v: unknown, fb: number, lo: number, hi: number): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fb;
};

const bool = (v: unknown, fb: boolean): boolean =>
  typeof v === "boolean" ? v : fb;

const oneOf = <T extends string>(v: unknown, fb: T, opts: readonly T[]): T =>
  (opts as readonly string[]).includes(String(v)) ? (v as T) : fb;

/** Clean an unknown payload into studio settings (or null when shapeless). */
export function parseLabelTemplate(raw: unknown): LabelSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const show = (r.show ?? {}) as Record<string, unknown>;
  return {
    paper: oneOf(r.paper, "roll80", ["roll80", "roll58", "a4", "custom"] as const),
    paperW: num(r.paperW, 80, 20, 500),
    paperH: num(r.paperH, 297, 20, 500),
    orient: oneOf(r.orient, "portrait", ["portrait", "landscape"] as const),
    stW: num(r.stW, 50, 10, 200),
    stH: num(r.stH, 30, 10, 200),
    gapX: num(r.gapX, 2, 0, 20),
    gapY: num(r.gapY, 2, 0, 20),
    padX: num(r.padX, 2, 0, 50),
    padY: num(r.padY, 3, 0, 50),
    mode: oneOf(r.mode, "both", ["both", "qr", "barcode"] as const),
    show: {
      name: bool(show.name, true), pid: bool(show.pid, true),
      price: bool(show.price, true), mrp: bool(show.mrp, true),
      barcode: bool(show.barcode, true), qr: bool(show.qr, true),
      sku: bool(show.sku, false), batch: bool(show.batch, true),
    },
  };
}

export function templateName(v: unknown): string {
  return String(v ?? "").trim().slice(0, 60);
}
