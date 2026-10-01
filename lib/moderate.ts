// Separate moderation layer: every inbound string passes through here before
// any agent, tool, or table sees it. Pure functions, no model calls, no I/O.
import DATA from "./moderation-data.json";

export type Verdict = "allow" | "warn" | "block";

const TOKENS = DATA.tokens as Record<string, number>;

const INJECTION = [
  /<\s*script/i, /javascript\s*:/i, /on\w+\s*=/i,
  /\.\.\//, /union\s+select/i, /drop\s+table/i, /insert\s+into/i,
  /--\s*$/, /;\s*(drop|delete|update)\s/i,
];

const LINK_SPAM = /https?:\/\/\S+|www\.\S+|\S+\.(ru|cn|tk|ml|ga|cf|gq)\b/i;

export interface ModResult {
  verdict: Verdict;
  reasons: string[];
  clean: string;
}

export function moderate(raw: string): ModResult {
  const reasons: string[] = [];
  let text = (raw || "").normalize("NFKC");
  // strip invisible/control/zalgo characters, keep it readable
  const before = text.length;
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\uFEFF\u0300-\u036F]/g, "");
  if (text.length < before) reasons.push("hidden characters removed");
  text = text.slice(0, 2000);
  const lower = text.toLowerCase();

  let verdict: Verdict = "allow";
  const words = lower.split(/[^a-z]+/);
  let hits = 0;
  const strong: string[] = [];
  for (const w of words) {
    const s = TOKENS[w] ?? 0;
    if (s <= 0) continue;
    hits += s;
    if (s >= 4) strong.push(w);
  }
  if (hits >= 4 || strong.length > 0) {
    verdict = "block";
    reasons.push("nsfw dataset match");
  }
  if (INJECTION.some((re) => re.test(text))) {
    verdict = "block";
    reasons.push("injection pattern");
  }
  if (verdict === "allow" && hits >= 2) {
    verdict = "warn";
    reasons.push("possible profanity");
  }
  if (verdict === "allow") {
    if (LINK_SPAM.test(text)) {
      verdict = "warn";
      reasons.push("external links held for review");
    }
    const letters = text.replace(/[^a-zA-Z]/g, "");
    const caps = text.replace(/[^A-Z]/g, "");
    if (letters.length > 12 && caps.length / letters.length > 0.85) {
      verdict = "warn";
      reasons.push("all-caps shouting");
    }
    const syms = (text.match(/[^a-zA-Z0-9\s.,!?'"\-@\u20B9]/g) || []).length;
    if (text.length > 20 && syms / text.length > 0.4) {
      verdict = "warn";
      reasons.push("symbol spam");
    }
  }
  // censor only strong tokens on warn/block, so legit words never get mangled.
  // blocks never reach the agent at all.
  let clean = text;
  if (verdict !== "allow") {
    for (const w of Object.keys(TOKENS)) {
      if ((TOKENS[w] ?? 0) < 4) continue;
      const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      clean = clean.replace(re, "***");
    }
  }
  return { verdict, reasons, clean };
}
