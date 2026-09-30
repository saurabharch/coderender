// Heuristic reply rubric (labeled as such — not provider evals).
// Scores support drafts 0–100: greeting 20, price/CTA 30, no banned promises 30, length 20.
const BANNED = ["guarantee", "guaranteed", "#1", "number 1", "rank #1", "promise you"];

export function scoreReply(text: string): { score: number; notes: string[] } {
  const t = text.toLowerCase();
  const notes: string[] = [];
  let score = 0;
  if (/^(hi|hello|hey|namaste)\b/.test(t)) score += 20; else notes.push("missing greeting");
  if (/₹|rs\.? |price|cost|book|call|slot|visit/i.test(text)) score += 30; else notes.push("no price or CTA");
  if (BANNED.some((b) => t.includes(b))) notes.push("banned promise found");
  else score += 30;
  if (text.length >= 20 && text.length <= 600) score += 20; else notes.push("length off (20–600 chars)");
  return { score, notes };
}
