// Pure WhatsApp-CRM helpers (no sqlite — safe for vitest).
// Triage doctrine (DeskcommCRM spirit): every inbound is classified,
// sentiment-scored, and routed — bot reply, human handoff, or silence.

const NEG = new Map<string, number>([
  ["angry", -3], ["furious", -3], ["terrible", -3], ["awful", -3], ["hate", -3],
  ["worst", -3], ["horrible", -3], ["disgusting", -3], ["useless", -2],
  ["bad", -2], ["poor", -2], ["slow", -1], ["late", -1], ["wrong", -2],
  ["broken", -2], ["refund", -2], ["complaint", -2], ["disappointed", -2],
  ["rude", -2], ["scam", -3], ["fraud", -3], ["cheat", -3], ["pathetic", -2],
  ["waste", -2], ["never", -1], ["cancel", -1], ["stupid", -2], ["idiot", -2],
  ["ganda", -2], ["bakwas", -2], ["bekar", -2], ["kharab", -2], ["chor", -3],
]);

const POS = new Map<string, number>([
  ["thanks", 2], ["thank", 2], ["great", 2], ["awesome", 2], ["excellent", 3],
  ["amazing", 2], ["love", 2], ["perfect", 2], ["best", 2], ["nice", 1],
  ["good", 1], ["happy", 2], ["satisfied", 2], ["quick", 1], ["helpful", 2],
  ["shukriya", 2], ["dhanyavad", 2], ["accha", 1], ["badia", 2],
]);

export function sentimentScore(text: string): number {
  const words = String(text ?? "").toLowerCase().split(/[^a-z]+/);
  let s = 0;
  for (const w of words) s += NEG.get(w) ?? POS.get(w) ?? 0;
  const n = Math.max(1, words.filter(Boolean).length);
  return Math.max(-1, Math.min(1, Math.round((s / Math.sqrt(n)) * 20) / 20));
}

export type Triage = "handoff" | "reply" | "silent";

export function triageInbound(text: string, opts: { stopped?: boolean } = {}): Triage {
  const t = String(text ?? "").trim();
  if (!t || opts.stopped) return "silent";
  if (/^\s*stop\s*$/i.test(t)) return "silent";
  if (sentimentScore(t) <= -0.4) return "handoff";
  return "reply";
}

// Template variables: "Hi {{1}}, order {{2}}" + ["Asha", "42"].
export function renderTemplate(body: string, vars: string[]): string {
  let out = String(body ?? "").slice(0, 2000);
  vars.slice(0, 10).forEach((v, i) => {
    out = out.replaceAll(`{{${i + 1}}}`, String(v).slice(0, 200));
  });
  return out;
}

export function isOptOut(text: string): boolean {
  return /^\s*stop\s*$/i.test(String(text ?? ""));
}

export function isOptIn(text: string): boolean {
  return /^\s*start\s*$/i.test(String(text ?? ""));
}
