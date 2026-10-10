// Pure proofreading checks (no sqlite, no network — safe for vitest).
// Local basics only: doubled words/spaces, repeated sentences, casing.
// Full grammar arrives via the LanguageTool hook when keyed.

export interface ProofIssue {
  kind: "double-word" | "double-space" | "repeat-sentence" | "casing";
  message: string;
  sample: string;
}

/** Local checks over plain text (HTML is stripped first). */
export function checkText(raw: string): ProofIssue[] {
  const text = raw.replace(/<[^>]+>/g, " ");
  const issues: ProofIssue[] = [];
  const words = text.split(/\s+/).filter(Boolean);
  for (let i = 1; i < words.length; i++) {
    const a = words[i - 1].toLowerCase().replace(/[^a-z]/g, "");
    const b = words[i].toLowerCase().replace(/[^a-z]/g, "");
    if (a.length >= 2 && a === b) {
      issues.push({ kind: "double-word", message: `Repeated word near "${words[i]}"`, sample: `${words[i - 1]} ${words[i]}` });
      i++;
    }
  }
  const dblSpace = text.match(/  +/g);
  if (dblSpace) issues.push({ kind: "double-space", message: `${dblSpace.length} double-space run(s)`, sample: "  " });
  const sentences = text.split(/[.!?]+/).map((s) => s.trim().toLowerCase()).filter((s) => s.length > 12);
  const seen = new Set<string>();
  for (const s of sentences) {
    if (seen.has(s)) {
      issues.push({ kind: "repeat-sentence", message: "Repeated sentence", sample: s.slice(0, 60) });
      break;
    }
    seen.add(s);
  }
  const starts = text.match(/(^|[.!?]\s+)([a-z])/);
  if (starts && words.length > 3) {
    issues.push({ kind: "casing", message: "A sentence starts lowercase", sample: starts[0].trim().slice(0, 40) });
  }
  return issues.slice(0, 20);
}
